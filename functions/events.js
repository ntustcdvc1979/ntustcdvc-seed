/**
 * 近期活動（events）的資料驗證。欄位與 src/utils/uploadEvents.cjs 上傳的格式一致：
 *   title、description、posterUrl、endDate（YYYY-MM-DD，過了這天前台就不顯示；可省略）
 */
import { HttpsError } from 'firebase-functions/v2/https';

const MAX_TITLE = 100;
const MAX_DESCRIPTION = 5000;
const MAX_URL = 2000;

/**
 * Google 雲端硬碟的分享連結不能直接當圖片用，轉成圖片直連（與 uploadEvents.cjs 相同的轉法）。
 * 支援 .../file/d/{id}/view、.../open?id={id}、.../uc?id={id}；其他網址原樣回傳。
 */
export function convertDriveUrl(url) {
  if (!url) return '';
  const fileId = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)?.[1]
    ?? url.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([^&#]+)/)?.[1];
  return fileId ? `https://lh3.googleusercontent.com/u/0/d/${fileId}=w1000` : url;
}

const invalid = (message) => new HttpsError('invalid-argument', message);

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

/** 驗證並整理前端送來的活動資料 */
export function parseEventInput(data) {
  const id = data?.id == null ? null : String(data.id);
  if (id !== null && !/^[^/]{1,1500}$/.test(id)) throw invalid('活動編號不正確');

  const title = String(data?.title ?? '').trim();
  if (!title) throw invalid('請輸入活動標題');
  if (title.length > MAX_TITLE) throw invalid(`標題請在 ${MAX_TITLE} 字以內`);

  // 內文保留使用者的換行與排版，只去掉最後多餘的空白
  const description = String(data?.description ?? '').trimEnd();
  if (description.length > MAX_DESCRIPTION) throw invalid(`活動內容請在 ${MAX_DESCRIPTION} 字以內`);

  let posterUrl = String(data?.posterUrl ?? '').trim();
  if (posterUrl) {
    if (posterUrl.length > MAX_URL) throw invalid('海報網址太長了');
    let parsed;
    try {
      parsed = new URL(posterUrl);
    } catch {
      throw invalid('海報網址格式不正確');
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw invalid('海報網址必須是 http 或 https 開頭');
    posterUrl = convertDriveUrl(posterUrl);
  }

  const endDate = String(data?.endDate ?? '').trim();
  if (endDate && !isValidDate(endDate)) throw invalid('結束日期格式不正確');

  return { id, title, description, posterUrl, endDate };
}
