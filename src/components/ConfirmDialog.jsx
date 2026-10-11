import React from 'react';
import { theme } from '../styles/theme';

/**
 * 網頁內的確認視窗。
 * 不用瀏覽器內建的 window.confirm()：LINE / Facebook 等 App 內建瀏覽器常會擋掉它，
 * 有時不跳出來、有時直接當作按了確定，對「刪除」這種動作太危險。
 */
export default function ConfirmDialog({ title, message, confirmLabel = '確認', onConfirm, onCancel, busy = false }) {
  return (
    <div
      className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        // 不要讓點擊傳到外層（例如萌芽解憂所點背景會關閉整個視窗）
        e.stopPropagation();
        if (!busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-white w-full max-w-[320px] rounded-[2rem] border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className="text-xl font-black mb-2" style={{ color: theme.dark }}>{title}</h3>
        {message && <p className="text-sm font-bold text-gray-500 leading-relaxed mb-6">{message}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="cursor-pointer py-3 rounded-2xl border-2 border-black font-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
            style={{ color: theme.dark }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="cursor-pointer py-3 rounded-2xl border-2 border-black font-black text-white bg-red-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            {busy ? '處理中...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
