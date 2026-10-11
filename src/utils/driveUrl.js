/**
 * Google 雲端硬碟的分享連結不能直接當圖片用，轉成圖片直連。
 * 後端儲存時也會做同樣的轉換（functions/events.js），這裡是給後台即時預覽用的。
 */
export function convertDriveUrl(url) {
  if (!url) return '';
  const fileId = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)?.[1]
    ?? url.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([^&#]+)/)?.[1];
  return fileId ? `https://lh3.googleusercontent.com/u/0/d/${fileId}=w1000` : url;
}
