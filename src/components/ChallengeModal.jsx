import React from 'react';
// import { theme } from '../styles/theme';

export default function ChallengeModal({ challenge, onDraw, onClose }) {
  if (!challenge) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[360px] rounded-[2.5rem] p-8 border-4 border-black relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
        
        {/* 天官賜試 標題 */}
        <div className="bg-[#ff5252] border-2 border-black px-4 py-1 rounded-full font-black text-xs text-white mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          ⚡ 智慧考驗來臨
        </div>

        {/* 考驗內容 (單一欄位) */}
        <div className="min-h-[120px] flex items-center justify-center py-4">
          <p className="font-black text-lg text-black leading-relaxed">
            {challenge.content}
          </p>
        </div>

        {/* 底部功能鈕 */}
        <div className="w-full grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={onDraw}
            className="bg-[#bad32d] border-2 border-black py-2.5 rounded-xl font-black text-sm text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            再抽一題
          </button>
          <button
            onClick={onClose}
            className="bg-gray-200 border-2 border-black py-2.5 rounded-xl font-black text-sm text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            讓我想想 🙏
          </button>
        </div>
      </div>
    </div>
  );
}