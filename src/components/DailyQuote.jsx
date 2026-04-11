import React from 'react';
import { theme } from '../styles/theme';

export default function DailyQuote({ currentQuote, onDraw }) {
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
          <p className="text-xs font-bold opacity-70 mt-2">點擊領取仙佛慈語</p>
        </button>
      ) : (
        <div 
          className="bg-white p-8 rounded-[2.5rem] border-4 text-center animate-in zoom-in duration-300 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]"
          style={{ borderColor: theme.yellow }}
        >
          <p className="text-2xl font-black leading-relaxed mb-4" style={{ color: theme.dark }}>
            「{currentQuote.content}」
          </p>
          <p className="text-xl font-black" style={{ color: theme.green }}>
            — {currentQuote.author}
          </p>
          <div className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            ✓ 已自動存入收藏
          </div>
        </div>
      )}
    </section>
  );
}