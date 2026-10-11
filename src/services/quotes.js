import { callable } from './functions';

/**
 * 取得慈語（登入者拿到全部，未登入只有一般慈語）。
 *
 * 由 Cloud Function 從快取的慈語目錄回傳，幾乎不花 Firestore 讀取次數；
 * 以前直接讀 daily_quotes，每次打開網頁都要讀 500 多次。
 * @returns {Promise<Array<{ id: string, content: string, author: string, type: string }>>}
 */
export async function fetchQuotes() {
  const { data } = await callable('getQuotes')();
  return data.quotes || [];
}
