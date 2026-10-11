import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { theme } from '../styles/theme';
import { copyToClipboard } from '../utils/browserEnv';

// 智慧語錄頁的網址（依目前網站位置自動產生，正式站就是 GitHub Pages 的網址）
const WISDOM_URL = new URL('wisdom.html', window.location.origin + import.meta.env.BASE_URL).href;

const buttonClass = 'cursor-pointer px-4 py-2.5 rounded-2xl border-2 border-black font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all';

/** 管理後台「智慧語錄 QR Code」分頁 */
export default function AdminQrCode() {
  const [qrSrc, setQrSrc] = useState(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 1024px 印成海報也夠清楚；容錯等級 M 足以應付一般印刷與拍攝
    QRCode.toDataURL(WISDOM_URL, { width: 1024, margin: 2, errorCorrectionLevel: 'M' })
      .then(setQrSrc)
      .catch((err) => {
        console.error('產生 QR Code 失敗:', err);
        setError(true);
      });
  }, []);

  const handleCopy = async () => {
    const ok = await copyToClipboard(WISDOM_URL);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div className="self-stretch text-left mb-4">
        <h2 className="text-lg font-black" style={{ color: theme.dark }}>智慧語錄 QR Code</h2>
        <p className="text-xs font-bold text-gray-400">掃描後不用登入就能抽仙佛慈語（只會抽到一般慈語）。可以印在海報或活動現場。</p>
      </div>

      {error ? (
        <p className="py-10 font-bold text-red-600">QR Code 產生失敗，請重新整理</p>
      ) : qrSrc ? (
        <img src={qrSrc} alt="智慧語錄 QR Code" className="w-64 h-64 border-4 border-black rounded-2xl" />
      ) : (
        <div className="w-64 h-64 border-4 border-dashed border-gray-300 rounded-2xl animate-pulse" />
      )}

      <p className="mt-4 text-xs font-mono font-bold text-gray-500 break-all">{WISDOM_URL}</p>

      <div className="flex flex-wrap justify-center gap-2 mt-5">
        <a
          href={qrSrc || undefined}
          download="智慧語錄-QRCode.png"
          aria-disabled={!qrSrc}
          className={`${buttonClass} text-white ${qrSrc ? '' : 'pointer-events-none opacity-50'}`}
          style={{ backgroundColor: theme.green }}
        >
          ⬇ 下載圖片
        </a>
        <button onClick={handleCopy} className={`${buttonClass} bg-white`} style={{ color: theme.dark }}>
          {copied ? '✅ 已複製' : '🔗 複製連結'}
        </button>
        <a href={WISDOM_URL} target="_blank" rel="noopener noreferrer" className={`${buttonClass} bg-white`} style={{ color: theme.dark }}>
          ↗ 開啟頁面
        </a>
      </div>
    </div>
  );
}
