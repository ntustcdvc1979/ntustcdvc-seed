import React, { useEffect, useRef, useState } from 'react';
import { theme } from '../styles/theme';
import { Logos } from '../assets/AssetManager';
import {
  buildExternalUrl,
  copyToClipboard,
  escapeToExternalBrowser,
  isIOS,
} from '../utils/browserEnv';

// 同一次開啟只自動跳轉一次，避免使用者選擇留在 App 內時被無限彈出
const AUTO_ESCAPE_FLAG = 'seed:auto-escape-attempted';

const MANUAL_HINTS = {
  line: isIOS()
    ? '請點右下角的「⋯」→ 選擇「用其他應用程式開啟」→ Safari'
    : '請點右上角的「⋯」→ 選擇「用其他瀏覽器開啟」',
  facebook: '請點右上角的「⋯」→ 選擇「在系統瀏覽器中開啟」',
  messenger: '請點右上角的「⋯」→ 選擇「在系統瀏覽器中開啟」',
  instagram: '請點右上角的「⋯」→ 選擇「在瀏覽器中開啟」',
  threads: '請點右上角的「⋯」→ 選擇「在瀏覽器中開啟」',
  wechat: '請點右上角的「⋯」→ 選擇「在瀏覽器開啟」',
  webview: '請複製下方網址，貼到 Chrome 或 Safari 開啟',
};

export default function InAppBrowserNotice({ browser, onContinueAnyway }) {
  const [copied, setCopied] = useState(false);
  const hasTriedAutoEscape = useRef(false);

  // 進來就先自動嘗試跳到外部瀏覽器；跳不了的環境才靠下面的手動引導
  useEffect(() => {
    if (hasTriedAutoEscape.current) return;
    hasTriedAutoEscape.current = true;

    if (sessionStorage.getItem(AUTO_ESCAPE_FLAG)) return;
    sessionStorage.setItem(AUTO_ESCAPE_FLAG, '1');
    escapeToExternalBrowser(browser.id);
  }, [browser.id]);

  const handleOpenExternal = () => {
    // 使用者主動點擊時不受 sessionStorage 限制，一律再試一次
    escapeToExternalBrowser(browser.id);
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(window.location.href);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-[400px] bg-white border-4 border-black rounded-[2.5rem] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center">
        <img src={Logos.Main} alt="Logo" className="h-14 object-contain mb-4" />

        <div
          className="border-2 border-black px-4 py-1 rounded-full font-black text-xs text-white mb-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          style={{ backgroundColor: '#ff5252' }}
        >
          ⚠️ 請用瀏覽器開啟
        </div>

        <h1 className="text-2xl font-black leading-snug mb-3" style={{ color: theme.dark }}>
          目前在 {browser.label} 的內建瀏覽器
        </h1>

        <p className="text-sm font-bold text-gray-600 leading-relaxed mb-6">
          Google 登入不支援 App 內建瀏覽器，
          請改用 Chrome 或 Safari 開啟，才能正常灌溉你的種子 🌱
        </p>

        <button
          onClick={handleOpenExternal}
          style={{ backgroundColor: theme.green }}
          className="w-full cursor-pointer text-white font-black text-lg py-4 rounded-2xl border-4 border-black shadow-[0_6px_0px_0px_#a5bc28] active:translate-y-1 active:shadow-none transition-all"
        >
          🚀 用外部瀏覽器開啟
        </button>

        <button
          onClick={handleCopy}
          className="w-full mt-3 cursor-pointer bg-white font-black text-sm py-3 rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
          style={{ color: theme.dark }}
        >
          {copied ? '✅ 已複製，貼到瀏覽器即可' : '🔗 複製網頁連結'}
        </button>

        <div className="mt-6 w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-4">
          <p className="text-xs font-black text-gray-400 tracking-widest mb-2">若按鈕沒有反應</p>
          <p className="text-xs font-bold text-gray-600 leading-relaxed">
            {MANUAL_HINTS[browser.id] || MANUAL_HINTS.webview}
          </p>
          <p className="mt-3 text-[11px] font-mono text-gray-500 break-all">{buildExternalUrl()}</p>
        </div>

        <button
          onClick={onContinueAnyway}
          className="mt-6 text-xs font-bold text-gray-400 underline cursor-pointer hover:text-gray-600 transition-colors"
        >
          仍要留在這裡（可能無法登入）
        </button>
      </div>
    </div>
  );
}
