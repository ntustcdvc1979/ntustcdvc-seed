/**
 * 崇德心靈種子 — Cloud Functions
 *
 * 慈語
 *   getQuotes             取得慈語目錄。登入者拿到全部，未登入（智慧語錄頁）只拿到一般慈語
 *   onQuoteWritten        慈語有變動時標記目錄需要更新
 *   refreshQuoteCatalog   每 10 分鐘檢查一次，需要時重建目錄
 * 萌芽解憂所
 *   askQuotes             用 RAG 挑出最合適的仙佛慈語，並存進歷史紀錄
 *   getAiHistory          讀取自己的歷史紀錄
 *   clearAiHistory        清除自己的歷史紀錄
 * 管理後台
 *   saveEvent / deleteEvent / reorderEvents   近期活動
 *
 * Gemini API 金鑰只存在 Firebase Secret Manager（GEMINI_API_KEY），不會出現在前端程式碼或 git 裡。
 * quote_catalog、ai_chats 沒有開放給前端，只能透過這裡的函式存取。
 */
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import {
  GeminiError,
  MAX_PICKED,
  TIMEOUT_STATUS,
  embedTexts,
  isKeyError,
  normalizeApiKey,
  pickQuotes,
  retrieve,
} from './rag.js';
import { loadCatalog, metaRef, needsRebuild, rebuildCatalog } from './catalog.js';
import { requireAdmin } from './admin.js';
import { parseEventInput } from './events.js';

initializeApp();
const db = getFirestore();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// Firestore 資料庫也在 asia-east1，觸發器必須跟資料庫同一區
setGlobalOptions({ region: 'asia-east1', maxInstances: 3 });

// 交給 Gemini 挑選的候選慈語數量
const TOP_K = 8;
const MAX_QUESTION_LENGTH = 300;
// 每隔多久確認一次目錄有沒有新版本（只讀 1 份 meta 文件）
const CATALOG_CHECK_MS = 5 * 60 * 1000;
// 排程重建時最多替幾則新慈語算向量；免費額度每分鐘 100 則，留一些給使用者提問
const SCHEDULED_EMBED_LIMIT = 80;
// 萌芽解憂所保留最近幾筆問答
const HISTORY_LIMIT = 50;
// 道親身分的快取時間；管理員修改後最晚這麼久生效
const TAOQIN_CACHE_MS = 10 * 60 * 1000;

// 一次提問的時間預算。Function 上限是 60 秒，前端會等到 70 秒；
// 超過預算還沒挑好慈語，就直接回傳相似度最高的幾則，不讓使用者白等。
const REQUEST_BUDGET_MS = 50_000;
const EMBED_TIMEOUT_MS = 10_000;
const PICK_TIMEOUT_MS = 30_000;
// 剩下的時間少於這個數字，就不呼叫 Gemini 挑選了
const MIN_PICK_TIME_MS = 5_000;
const FALLBACK_REPLY = '為你找到幾則相關的仙佛慈語，願它們陪你走過此刻。';

// ───────────── 慈語目錄 ─────────────

let catalog = null; // { version, quotes, byId, withVectors, checkedAt }
let catalogLoading = null;

/** 取得慈語目錄。大多數時候直接用記憶體裡的；每 5 分鐘只花 1 次讀取確認有沒有新版本 */
function getCatalog() {
  if (catalog && Date.now() - catalog.checkedAt < CATALOG_CHECK_MS) return Promise.resolve(catalog);

  // 同時有好幾個請求時共用同一次讀取
  catalogLoading ??= (async () => {
    let meta = (await metaRef(db).get()).data();
    if (!meta?.version) {
      // 第一次使用：直接從 daily_quotes 建立（沿用舊版向量，不需要金鑰）
      logger.info('慈語目錄不存在，開始建立');
      await rebuildCatalog(db, null, { maxEmbed: 0 });
      meta = (await metaRef(db).get()).data();
    }
    if (catalog?.version === meta.version) {
      catalog.checkedAt = Date.now();
    } else {
      catalog = { ...(await loadCatalog(db, meta)), checkedAt: Date.now() };
    }
    return catalog;
  })().finally(() => { catalogLoading = null; });

  return catalogLoading;
}

const toPublicQuote = ({ id, content, author, type }) => ({ id, content, author, type });

export const getQuotes = onCall(async (request) => {
  const { quotes } = await getCatalog();
  // 智慧語錄頁不需要登入，只提供一般慈語（等同非道親）
  const visible = request.auth ? quotes : quotes.filter((q) => q.type === 'non_Taoqin');
  return { quotes: visible.map(toPublicQuote) };
});

/** 慈語被新增、修改或刪除時，只標記「需要更新」，由排程統一重建，避免大量上傳時重建好幾百次 */
export const onQuoteWritten = onDocumentWritten('daily_quotes/{quoteId}', async () => {
  await metaRef(db).set({ dirtyAt: Date.now() }, { merge: true });
});

export const refreshQuoteCatalog = onSchedule(
  { schedule: 'every 10 minutes', secrets: [GEMINI_API_KEY], timeoutSeconds: 300, memory: '512MiB' },
  async () => {
    const meta = (await metaRef(db).get()).data();
    if (!needsRebuild(meta)) return;

    const result = await rebuildCatalog(db, normalizeApiKey(GEMINI_API_KEY.value()), {
      maxEmbed: SCHEDULED_EMBED_LIMIT,
      maxWaitMs: 60_000,
    });
    logger.info('慈語目錄已重建', result);
  },
);

// ───────────── 萌芽解憂所 ─────────────

const chatRef = (uid) => db.collection('ai_chats').doc(uid);
const legacyHistoryRef = (uid) => chatRef(uid).collection('messages');

const requireAuth = (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', '請先登入');
  return request.auth.uid;
};

const taoQinCache = new Map(); // uid → { value, at }

/** 道親身分以資料庫為準，不相信前端傳來的值；判斷方式與前端抽慈語一致 */
async function isTaoQinUser(uid) {
  const cached = taoQinCache.get(uid);
  if (cached && Date.now() - cached.at < TAOQIN_CACHE_MS) return cached.value;
  const value = (await db.collection('users').doc(uid).get()).data()?.isTaoQin === true;
  taoQinCache.set(uid, { value, at: Date.now() });
  return value;
}

/** Gemini 太慢或太忙時，改用相似度最高的幾則，至少讓使用者拿到慈語 */
const shouldFallback = (err) =>
  err instanceof GeminiError && (err.status === TIMEOUT_STATUS || err.status === 429 || err.status >= 500);

export const askQuotes = onCall(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    const uid = requireAuth(request);

    const question = String(request.data?.question ?? '').trim();
    if (!question) {
      throw new HttpsError('invalid-argument', '請輸入想問的問題');
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      throw new HttpsError('invalid-argument', `問題請在 ${MAX_QUESTION_LENGTH} 字以內`);
    }

    const apiKey = normalizeApiKey(GEMINI_API_KEY.value());
    const startedAt = Date.now();
    const timing = {};
    let reply;
    let quotes;
    try {
      const [{ withVectors }, isTaoQin] = await Promise.all([getCatalog(), isTaoQinUser(uid)]);
      timing.catalogMs = Date.now() - startedAt;
      const visibleQuotes = withVectors.filter((q) => isTaoQin || q.type === 'non_Taoqin');

      let t = Date.now();
      const [queryVector] = await embedTexts(apiKey, [question], 'RETRIEVAL_QUERY', {
        maxWaitMs: 5_000,
        timeoutMs: EMBED_TIMEOUT_MS,
      });
      timing.embedMs = Date.now() - t;

      const candidates = retrieve(queryVector, visibleQuotes, TOP_K);
      if (candidates.length === 0) {
        throw new HttpsError('failed-precondition', '慈語索引還沒建立好，請通知管理員');
      }

      let picked;
      const remaining = REQUEST_BUDGET_MS - (Date.now() - startedAt);
      t = Date.now();
      try {
        if (remaining < MIN_PICK_TIME_MS) throw new GeminiError(TIMEOUT_STATUS, '時間預算不足，略過挑選');
        const result = await pickQuotes(apiKey, question, candidates, {
          timeoutMs: Math.min(PICK_TIMEOUT_MS, remaining),
        });
        reply = result.reply;
        picked = result.picked;
      } catch (err) {
        if (!shouldFallback(err)) throw err;
        logger.warn('挑選慈語太慢或失敗，改用相似度最高的慈語', { uid, error: err.message });
        timing.fallback = true;
        reply = FALLBACK_REPLY;
        picked = candidates.slice(0, MAX_PICKED).map((_, i) => i);
      }
      timing.pickMs = Date.now() - t;

      // 慈語內容直接取自資料庫，一字不改地回傳
      quotes = picked.map((i) => toPublicQuote(candidates[i]));
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error('askQuotes 失敗', { uid, error: err.message });
      if (isKeyError(err)) {
        logger.error('GEMINI_API_KEY 無效：請用 npm run check-key 確認金鑰後，重新執行 functions:secrets:set 並重新部署');
        throw new HttpsError('failed-precondition', 'AI 服務的金鑰設定有誤，請通知管理員');
      }
      if (err instanceof GeminiError && err.status === 429) {
        throw new HttpsError('resource-exhausted', '目前提問的人太多了，請稍等一分鐘再試 🙏');
      }
      throw new HttpsError('internal', 'AI 暫時無法回應，請稍後再試');
    }

    // 各步驟花了多久，回答變慢時看紀錄就知道卡在哪裡（npm run logs）
    logger.info('askQuotes 完成', { ...timing, totalMs: Date.now() - startedAt });

    // 每位使用者的紀錄放在同一份文件；arrayUnion 直接附加，不需要先讀取。
    // 只存慈語 id，之後讀歷史時再從目錄取原文，確保顯示的永遠是原文
    const createdAt = Date.now();
    try {
      await chatRef(uid).set({
        entries: FieldValue.arrayUnion({ question, reply, quoteIds: quotes.map((q) => q.id), createdAt }),
      }, { merge: true });
    } catch (err) {
      // 存不進歷史不影響這次回答
      logger.warn('儲存歷史紀錄失敗', { uid, error: err.message });
    }

    return { reply, quotes, createdAt };
  },
);

export const getAiHistory = onCall(async (request) => {
  const uid = requireAuth(request);
  const [snap, { byId }] = await Promise.all([chatRef(uid).get(), getCatalog()]);
  const data = snap.data();
  let entries = data?.entries || [];
  let needsWrite = false;

  // 舊版每筆問答一份文件；第一次讀取時搬進同一份文件，之後打開只要讀 1 次
  if (!data?.migrated) {
    const legacy = await legacyHistoryRef(uid).orderBy('createdAt', 'desc').limit(HISTORY_LIMIT).get();
    if (!legacy.empty) {
      entries = [...legacy.docs.map((d) => {
        const { question, reply, quoteIds, createdAt } = d.data();
        return { question, reply: reply || '', quoteIds: quoteIds || [], createdAt };
      }), ...entries];
      await db.recursiveDelete(legacyHistoryRef(uid));
    }
    needsWrite = true;
  }

  entries.sort((a, b) => a.createdAt - b.createdAt);
  if (entries.length > HISTORY_LIMIT) {
    entries = entries.slice(-HISTORY_LIMIT);
    needsWrite = true;
  }
  if (needsWrite) await chatRef(uid).set({ entries, migrated: true }, { merge: true });

  return {
    entries: entries.map((e) => ({
      id: String(e.createdAt),
      question: e.question,
      reply: e.reply || '',
      // 已被刪除的慈語就略過
      quotes: (e.quoteIds || []).map((id) => byId.get(id)).filter(Boolean).map(toPublicQuote),
      createdAt: e.createdAt,
    })),
  };
});

export const clearAiHistory = onCall(async (request) => {
  const uid = requireAuth(request);
  // 連同舊版的子集合一起刪除
  await db.recursiveDelete(chatRef(uid));
  await chatRef(uid).set({ entries: [], migrated: true });
  return { ok: true };
});

// ───────────── 管理後台：近期活動 ─────────────
// 活動的 Firestore 規則是「前端不可寫」，所以由這裡用 Admin SDK 寫入，並檢查是不是管理員。

// Firestore 的 NOT_FOUND 錯誤代碼
const FIRESTORE_NOT_FOUND = 5;

export const saveEvent = onCall(async (request) => {
  requireAdmin(request);
  const { id, title, description, posterUrl, endDate } = parseEventInput(request.data);
  const events = db.collection('events');

  if (id) {
    try {
      // update 遇到不存在的文件會直接失敗，不必先讀一次確認
      await events.doc(id).update({
        title,
        description,
        posterUrl,
        // 清空結束日期 = 一直顯示，所以要把欄位整個拿掉
        endDate: endDate || FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      if (err.code === FIRESTORE_NOT_FOUND) throw new HttpsError('not-found', '找不到這個活動，可能已經被刪除了');
      throw err;
    }
    return { id };
  }

  // 新活動排在最前面：order 比目前最小的再小 1（order 越小越前面）
  const first = await events.orderBy('order', 'asc').limit(1).get();
  const order = (first.empty ? 0 : first.docs[0].data().order) - 1;

  const ref = await events.add({
    title,
    description,
    posterUrl,
    order,
    ...(endDate ? { endDate } : {}),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
});

export const deleteEvent = onCall(async (request) => {
  requireAdmin(request);
  const id = String(request.data?.id ?? '');
  if (!/^[^/]{1,1500}$/.test(id)) throw new HttpsError('invalid-argument', '活動編號不正確');
  await db.collection('events').doc(id).delete();
  return { ok: true };
});

const MAX_REORDER = 200;

/** 依照 ids 的順序重新編排活動（第一個 order = 0）；已被刪除的活動會被略過 */
export const reorderEvents = onCall(async (request) => {
  requireAdmin(request);
  const ids = request.data?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_REORDER
      || !ids.every((id) => typeof id === 'string' && /^[^/]{1,1500}$/.test(id))
      || new Set(ids).size !== ids.length) {
    throw new HttpsError('invalid-argument', '活動順序資料不正確');
  }

  const refs = ids.map((id) => db.collection('events').doc(id));
  const snaps = await db.getAll(...refs);
  const batch = db.batch();
  snaps.forEach((snap, index) => {
    if (snap.exists) batch.update(snap.ref, { order: index });
  });
  await batch.commit();
  return { ok: true };
});
