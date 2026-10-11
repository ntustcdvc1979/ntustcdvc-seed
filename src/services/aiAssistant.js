import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
// 確保預設的 Firebase app 已經初始化
import '../firebase-config';

// 必須和 functions/index.js 的 region 一致
const functions = getFunctions(getApp(), 'asia-east1');
const askQuotesCallable = httpsCallable(functions, 'askQuotes', { timeout: 60_000 });
const getAiHistoryCallable = httpsCallable(functions, 'getAiHistory');
const clearAiHistoryCallable = httpsCallable(functions, 'clearAiHistory');

/**
 * @typedef {{ id: string, content: string, author: string }} Quote
 * @returns {Promise<{ reply: string, quotes: Quote[], createdAt: number }>}
 */
export async function askQuotes(question) {
  const { data } = await askQuotesCallable({ question });
  return data;
}

/**
 * 最近的問答紀錄，由舊到新。
 * @returns {Promise<Array<{ id: string, question: string, reply: string, quotes: Quote[], createdAt: number }>>}
 */
export async function getAiHistory() {
  const { data } = await getAiHistoryCallable();
  return data.entries || [];
}

export async function clearAiHistory() {
  await clearAiHistoryCallable();
}

/** 把 Cloud Function 的錯誤轉成給使用者看的訊息 */
export function describeAiError(err) {
  switch (err?.code) {
    // 這幾種錯誤的訊息是後端特地寫給使用者看的
    case 'functions/resource-exhausted':
    case 'functions/invalid-argument':
    case 'functions/failed-precondition':
      return err.message;
    case 'functions/unauthenticated':
      return '登入狀態已失效，請重新登入';
    case 'functions/not-found':
      return 'AI 小助手還沒上線，請稍後再試';
    case 'functions/deadline-exceeded':
      return '思考得太久了，請再問一次';
    case 'functions/unavailable':
      return '網路連線不穩定，請稍後再試';
    default:
      return 'AI 暫時無法回應，請稍後再試';
  }
}
