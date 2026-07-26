/**
 * App 內建瀏覽器 (WebView) 偵測與逃脫工具。
 *
 * 為什麼需要這個檔案：
 * Google OAuth 會直接封鎖「App 內建瀏覽器」的登入請求 (disallowed_useragent)，
 * 所以在 LINE / FB / IG 裡點開連結時，signInWithPopup 與 signInWithRedirect 都會失敗，
 * 使用者只會看到一片空白或錯誤。唯一可靠的解法是把使用者導到系統的外部瀏覽器。
 */

const getUA = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent || '');

// 各家 App 內建瀏覽器的 User-Agent 特徵
const IN_APP_SIGNATURES = [
  { id: 'line', label: 'LINE', pattern: /\bLine\/|\bLIFF\b/i },
  { id: 'facebook', label: 'Facebook', pattern: /\bFBAN\b|\bFBAV\b|\bFB_IAB\b/i },
  { id: 'messenger', label: 'Messenger', pattern: /\bMessenger\b/i },
  { id: 'instagram', label: 'Instagram', pattern: /\bInstagram\b/i },
  { id: 'threads', label: 'Threads', pattern: /\bBarcelona\b/i },
  { id: 'wechat', label: '微信', pattern: /\bMicroMessenger\b/i },
];

export const isIOS = () => /iPad|iPhone|iPod/i.test(getUA());
export const isAndroid = () => /Android/i.test(getUA());

/**
 * @returns {{ id: string, label: string }|null} 偵測到的內建瀏覽器，一般瀏覽器則回傳 null
 */
export const detectInAppBrowser = () => {
  // 在一般瀏覽器加上 ?inAppTest=line 就能預覽引導畫面，方便驗證
  if (typeof window !== 'undefined') {
    const forced = new URLSearchParams(window.location.search).get('inAppTest');
    const preset = IN_APP_SIGNATURES.find(({ id }) => id === forced);
    if (preset) return { id: preset.id, label: preset.label };
  }

  const ua = getUA();
  const matched = IN_APP_SIGNATURES.find(({ pattern }) => pattern.test(ua));
  if (matched) return { id: matched.id, label: matched.label };

  // Android 泛用 WebView（部分 App 沒有自訂 UA，只留下 "; wv" 標記）
  if (/Android/i.test(ua) && /;\s*wv\)/i.test(ua)) {
    return { id: 'webview', label: 'App 內建瀏覽器' };
  }
  return null;
};

/** 目前頁面網址，並附上 LINE 專用的 openExternalBrowser 參數 */
export const buildExternalUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.set('openExternalBrowser', '1');
  return url.toString();
};

/**
 * 嘗試自動跳到系統的外部瀏覽器。
 * @param {string} browserId detectInAppBrowser() 回傳的 id
 * @returns {boolean} 是否有可用的自動跳轉手段（false 代表只能請使用者手動操作）
 */
export const escapeToExternalBrowser = (browserId) => {
  // ?inAppTest= 預覽模式：只印訊息，不要真的把畫面導走
  if (new URLSearchParams(window.location.search).has('inAppTest')) {
    console.info('[inAppTest] 會跳轉到:', buildExternalUrl());
    return true;
  }

  // LINE 內建瀏覽器看到 openExternalBrowser=1 就會改用系統瀏覽器開啟
  if (browserId === 'line') {
    window.location.href = buildExternalUrl();
    return true;
  }

  // Android 可以用 intent:// 指定交給 Chrome 開啟
  if (isAndroid()) {
    const { host, pathname, search } = window.location;
    const fallback = encodeURIComponent(window.location.href);
    window.location.href =
      `intent://${host}${pathname}${search}` +
      `#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
    return true;
  }

  // iOS 的 FB / IG 沒有公開的跳轉方式，只能引導使用者自己按「用瀏覽器開啟」
  return false;
};

/**
 * 已經回到正常瀏覽器後，把 openExternalBrowser 參數從網址列清掉，
 * 避免使用者把帶參數的網址再分享出去。
 */
export const stripExternalBrowserParam = () => {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('openExternalBrowser')) return;
  url.searchParams.delete('openExternalBrowser');
  window.history.replaceState({}, '', url.toString());
};

/** 複製文字到剪貼簿，涵蓋舊版 WebView 沒有 navigator.clipboard 的情況 */
export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 忽略，改用下面的備援作法
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};
