import React from 'react';
import { theme } from '../styles/theme';

export default function DailyQuote({ currentQuote, onDraw, onOpenCollection }) {
  return (
    <section className="mb-12 text-center">
      {!currentQuote ? (
        <button 
          onClick={onDraw} 
          style={{ 
            backgroundColor: theme.yellow, 
            boxShadow: `0 8px 0px 0px #d4a017`,
            color: theme.dark 
          }}
          className="w-full p-8 rounded-[2.5rem] font-black text-2xl active:translate-y-1 active:shadow-none transition-all"
        >
          ✨ 抽取今日正能量 ✨
          <p className="text-base font-bold opacity-70 mt-2">點擊領取仙佛慈語</p>
        </button>
      ) : (
        <div className="space-y-4 animate-in zoom-in duration-300">
          <div 
            className="bg-white p-8 rounded-[2.5rem] border-4 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]"
            style={{ borderColor: theme.yellow }}
          >
            <p className="text-2xl font-black leading-relaxed mb-4" style={{ color: theme.dark }}>
              「{currentQuote.content}」
            </p>
            <p className="text-xl font-black" style={{ color: theme.green }}>
              — {currentQuote.author}
            </p>
          </div>

          {/* 再抽一張與查看歷史紀錄 */}
          <div className="flex gap-3">
            <button 
              onClick={onDraw}
              style={{ backgroundColor: theme.green }}
              className="flex-1 text-white py-3 rounded-2xl font-black text-sm shadow-[0_4px_0px_0px_#a5bc28] active:translate-y-1 active:shadow-none transition-all"
            >
              🔄 再抽一張
            </button>
            <button 
              onClick={onOpenCollection}
              className="flex-1 bg-white border-2 py-3 rounded-2xl font-black text-sm transition-all"
              style={{ borderColor: theme.dark, color: theme.dark }}
            >
              📚 歷史紀錄
            </button>
          </div>
        </div>
      )}
    </section>
  );
}