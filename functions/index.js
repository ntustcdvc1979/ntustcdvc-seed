/**
 * 崇德心靈種子 — Cloud Functions
 *
 * askQuotes：慈語小助手。前端用 httpsCallable 呼叫，Gemini API 金鑰只存在
 * Firebase Secret Manager（GEMINI_API_KEY），不會出現在前端程式碼或 git 裡。
 */
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import { GeminiError, embedTexts, isKeyError, normalizeApiKey, pickQuotes, retrieve } from './rag.js';
import { fillMissingEmbeddings, loadQuoteIndex } from './quoteIndex.js';

initializeApp();
const db = getFirestore();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

setGlobalOptions({ region: 'asia-east1', maxInstances: 3 });

// 每位使用者每天可以問幾次（Gemini 免費額度是整個專案共用的）
const DAILY_LIMIT_PER_USER = 10;
// 交給 Gemini 挑選的候選慈語數量
const TOP_K = 8;
const MAX_QUESTION_LENGTH = 300;
// 少量新慈語（例如剛上傳幾則）直接在請求中補算向量；太多就要跑 npm run build-index
const MAX_INLINE_EMBED = 20;
// 慈語索引在記憶體中的快取時間，過期後重新讀取（上傳新慈語後最晚這麼久會生效）
const INDEX_TTL_MS = 30 * 60 * 1000;

let indexCache = null;

async function getQuoteIndex(apiKey) {
  if (indexCache && Date.now() - indexCache.loadedAt < INDEX_TTL_MS) return indexCache.items;

  const { items, missing } = await loadQuoteIndex(db);
  if (missing.length > 0 && missing.length <= MAX_INLINE_EMBED) {
    try {
      await fillMissingEmbeddings(db, apiKey, missing);
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

const todayInTaipei = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(new Date());

/** 扣一次使用額度；已用完回傳 false */
async function consumeDailyQuota(uid) {
  const ref = db.collection('ai_usage').doc(uid);
  const today = todayInTaipei();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    const used = data?.date === today ? data.count : 0;
    if (used >= DAILY_LIMIT_PER_USER) return false;
    tx.set(ref, { date: today, count: used + 1, updatedAt: FieldValue.serverTimestamp() });
    return true;
  });
}

export const askQuotes = onCall(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '請先登入');
    }

    const question = String(request.data?.question ?? '').trim();
    if (!question) {
      throw new HttpsError('invalid-argument', '請輸入想問的問題');
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      throw new HttpsError('invalid-argument', `問題請在 ${MAX_QUESTION_LENGTH} 字以內`);
    }

    const uid = request.auth.uid;
    if (!(await consumeDailyQuota(uid))) {
      throw new HttpsError('resource-exhausted', `每天最多可以問 ${DAILY_LIMIT_PER_USER} 次，明天再來吧 🙏`);
    }

    // 道親身分以資料庫為準，不相信前端傳來的值；判斷方式與前端抽慈語一致
    const userSnap = await db.collection('users').doc(uid).get();
    const isTaoQin = userSnap.data()?.isTaoQin === true;

    const apiKey = normalizeApiKey(GEMINI_API_KEY.value());
    try {
      const allQuotes = await getQuoteIndex(apiKey);
      const visibleQuotes = allQuotes.filter((q) => isTaoQin || q.type === 'non_Taoqin');

      const [queryVector] = await embedTexts(apiKey, [question], 'RETRIEVAL_QUERY', { maxWaitMs: 10_000 });
      const candidates = retrieve(queryVector, visibleQuotes, TOP_K);
      if (candidates.length === 0) {
        throw new HttpsError('failed-precondition', '慈語索引還沒建立好，請通知管理員');
      }

      const { reply, picked } = await pickQuotes(apiKey, question, candidates);

      // 慈語內容直接取自資料庫，一字不改地回傳
      return {
        reply,
        quotes: picked.map((i) => ({
          id: candidates[i].id,
          content: candidates[i].content,
          author: candidates[i].author,
        })),
      };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error('askQuotes 失敗', { uid, error: err.message });
      if (isKeyError(err)) {
        logger.error('GEMINI_API_KEY 無效：請用 npm run check-key 確認金鑰後，重新執行 functions:secrets:set 並重新部署');
        throw new HttpsError('failed-precondition', 'AI 服務的金鑰設定有誤，請通知管理員');
      }
      if (err instanceof GeminiError && err.status === 429) {
        throw new HttpsError('resource-exhausted', '今天的 AI 額度已經用完了，明天再來吧 🙏');
      }
      throw new HttpsError('internal', 'AI 暫時無法回應，請稍後再試');
    }
  },
);
