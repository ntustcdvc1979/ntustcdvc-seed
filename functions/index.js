/**
 * 崇德心靈種子 — Cloud Functions（萌芽解憂所）
 *
 * askQuotes       使用者發問，用 RAG 挑出最合適的仙佛慈語，並把這次問答存進歷史紀錄
 * getAiHistory    讀取自己的歷史紀錄
 * clearAiHistory  清除自己的歷史紀錄
 * saveEvent       管理員新增 / 修改近期活動
 * deleteEvent     管理員刪除近期活動
 *
 * 前端用 httpsCallable 呼叫。Gemini API 金鑰只存在 Firebase Secret Manager（GEMINI_API_KEY），
 * 不會出現在前端程式碼或 git 裡。歷史紀錄放在 ai_chats/{uid}/messages，Firestore 規則沒有開放這個
 * collection，所以前端無法直接讀寫，只能透過這裡的函式存取，而且只拿得到自己的。
 */
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
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
import { fillMissingEmbeddings, loadQuoteIndex } from './quoteIndex.js';
import { requireAdmin } from './admin.js';
import { parseEventInput } from './events.js';

initializeApp();
const db = getFirestore();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

setGlobalOptions({ region: 'asia-east1', maxInstances: 3 });

// 交給 Gemini 挑選的候選慈語數量
const TOP_K = 8;
const MAX_QUESTION_LENGTH = 300;
// 少量新慈語（例如剛上傳幾則）直接在請求中補算向量；太多就要跑 npm run build-index
const MAX_INLINE_EMBED = 20;
// 慈語索引在記憶體中的快取時間，過期後重新讀取（上傳新慈語後最晚這麼久會生效）
const INDEX_TTL_MS = 30 * 60 * 1000;
// 打開萌芽解憂所時載入最近幾筆問答
const HISTORY_LIMIT = 50;

// 一次提問的時間預算。Function 上限是 60 秒，前端會等到 70 秒；
// 超過預算還沒挑好慈語，就直接回傳相似度最高的幾則，不讓使用者白等。
const REQUEST_BUDGET_MS = 50_000;
const EMBED_TIMEOUT_MS = 10_000;
const PICK_TIMEOUT_MS = 30_000;
// 剩下的時間少於這個數字，就不呼叫 Gemini 挑選了
const MIN_PICK_TIME_MS = 5_000;
const FALLBACK_REPLY = '為你找到幾則相關的仙佛慈語，願它們陪你走過此刻。';

let indexCache = null;
let indexLoading = null;

async function loadIndex(apiKey) {
  const { items, missing } = await loadQuoteIndex(db);
  if (missing.length > 0 && missing.length <= MAX_INLINE_EMBED) {
    try {
      await fillMissingEmbeddings(db, apiKey, missing, { timeoutMs: EMBED_TIMEOUT_MS });
    } catch (err) {
      // 補不上也沒關係，這幾則只是暫時搜尋不到
      logger.warn('補算慈語向量失敗', { count: missing.length, error: err.message });
    }
  } else if (missing.length > MAX_INLINE_EMBED) {
    logger.warn(`有 ${missing.length} 則慈語還沒有向量，請在 functions 目錄執行 npm run build-index`);
  }

  indexCache = { loadedAt: Date.now(), items };
  return items;
}

async function getQuoteIndex(apiKey) {
  if (indexCache && Date.now() - indexCache.loadedAt < INDEX_TTL_MS) return indexCache.items;
  // 同時有好幾個人提問時，共用同一次讀取，不要各自讀一遍
  indexLoading ??= loadIndex(apiKey).finally(() => { indexLoading = null; });
  return indexLoading;
}

/** Gemini 太慢或太忙時，改用相似度最高的幾則，至少讓使用者拿到慈語 */
const shouldFallback = (err) =>
  err instanceof GeminiError && (err.status === TIMEOUT_STATUS || err.status === 429 || err.status >= 500);

const historyRef = (uid) => db.collection('ai_chats').doc(uid).collection('messages');

const requireAuth = (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', '請先登入');
  return request.auth.uid;
};

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

    // 道親身分以資料庫為準，不相信前端傳來的值；判斷方式與前端抽慈語一致
    const userSnap = await db.collection('users').doc(uid).get();
    const isTaoQin = userSnap.data()?.isTaoQin === true;

    const apiKey = normalizeApiKey(GEMINI_API_KEY.value());
    const startedAt = Date.now();
    const timing = {};
    let reply;
    let quotes;
    try {
      const wasCached = Boolean(indexCache && Date.now() - indexCache.loadedAt < INDEX_TTL_MS);
      const allQuotes = await getQuoteIndex(apiKey);
      timing.indexMs = Date.now() - startedAt;
      timing.indexCached = wasCached;
      const visibleQuotes = allQuotes.filter((q) => isTaoQin || q.type === 'non_Taoqin');

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
      quotes = picked.map((i) => ({
        id: candidates[i].id,
        content: candidates[i].content,
        author: candidates[i].author,
      }));
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

    // 只存慈語 id，之後讀歷史時再從資料庫取原文，確保顯示的永遠是原文
    const createdAt = Date.now();
    try {
      await historyRef(uid).add({ question, reply, quoteIds: quotes.map((q) => q.id), createdAt });
    } catch (err) {
      // 存不進歷史不影響這次回答
      logger.warn('儲存歷史紀錄失敗', { uid, error: err.message });
    }

    return { reply, quotes, createdAt };
  },
);

export const getAiHistory = onCall(async (request) => {
  const uid = requireAuth(request);

  const snap = await historyRef(uid).orderBy('createdAt', 'desc').limit(HISTORY_LIMIT).get();
  const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();

  // 一次把所有用到的慈語讀出來；已被刪除的慈語就略過
  const quoteIds = [...new Set(entries.flatMap((e) => e.quoteIds || []))];
  const quoteDocs = quoteIds.length
    ? await db.getAll(...quoteIds.map((id) => db.collection('daily_quotes').doc(id)))
    : [];
  const quotesById = new Map(
    quoteDocs
      .filter((d) => d.exists)
      .map((d) => [d.id, { id: d.id, content: d.data().content, author: d.data().author || '' }]),
  );

  return {
    entries: entries.map((e) => ({
      id: e.id,
      question: e.question,
      reply: e.reply || '',
      quotes: (e.quoteIds || []).map((id) => quotesById.get(id)).filter(Boolean),
      createdAt: e.createdAt,
    })),
  };
});

export const clearAiHistory = onCall(async (request) => {
  const uid = requireAuth(request);
  await db.recursiveDelete(historyRef(uid));
  return { ok: true };
});

// ───────────── 管理後台：近期活動 ─────────────
// 活動的 Firestore 規則是「前端不可寫」，所以由這裡用 Admin SDK 寫入，並檢查是不是管理員。

export const saveEvent = onCall(async (request) => {
  requireAdmin(request);
  const { id, title, description, posterUrl, endDate } = parseEventInput(request.data);
  const events = db.collection('events');

  if (id) {
    const ref = events.doc(id);
    if (!(await ref.get()).exists) throw new HttpsError('not-found', '找不到這個活動，可能已經被刪除了');
    await ref.update({
      title,
      description,
      posterUrl,
      // 清空結束日期 = 一直顯示，所以要把欄位整個拿掉
      endDate: endDate || FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id };
  }

  const ref = await events.add({
    title,
    description,
    posterUrl,
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
