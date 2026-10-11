import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

// 必須和 functions/index.js 的 region 一致
const REGION = 'asia-east1';

let instance = null;

/**
 * 取得某個 Cloud Function 的呼叫器。
 * 第一次用到時才建立連線，這樣主網站（firebase-config.js）和智慧語錄頁（firebase-options.js）
 * 可以各自初始化 Firebase，這裡不必綁定其中一個。
 */
export function callable(name, options) {
  instance ??= getFunctions(getApp(), REGION);
  return httpsCallable(instance, name, options);
}
