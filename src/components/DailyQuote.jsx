import React from 'react';
import { theme } from '../styles/theme';

export default function DailyQuote({ currentQuote, onDraw, onOpenCollection, onCloseQuote, userData }) {
  const isFavorite = userData?.favorite?.includes(currentQuote?.id);

  return (
    <section className="text-center">
      {/* 1. 主頁底部的抽取按鈕 */}
      <button 
        onClick={onDraw} 
        style={{ 
          backgroundColor: theme.yellow, 
          boxShadow: `0 6px 0px 0px #d4a017`,
        }}
        className="cursor-pointer rounded-[2rem] text-white font-black text-xl active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 border-4 border-black"
      >
        <span className="text-2xl">✨</span>
        <div>
           <p>領取仙佛慈語</p>
           <p className="text-base font-bold">為種子灑上甘露水</p>
        </div>
        <span className="text-2xl">✨</span>
      </button>

      {currentQuote && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 text-left overflow-hidden">
          <div className="bg-white w-full max-w-[380px] rounded-[2.5rem] p-8 border-4 border-black animate-in zoom-in duration-300 relative shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            
            {/* 收藏狀態標籤 */}
            {isFavorite && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#ff4757] text-white px-4 py-1 rounded-full font-black text-xs shadow-lg animate-bounce">
                已加入收藏 ❤️
              </div>
            )}

            <button 
              onClick={onCloseQuote} 
              className="absolute top-4 right-6 font-black text-2xl p-2 cursor-pointer hover:opacity-50 transition-opacity"
            >
              ✕
            </button>
            
            <div className="text-center space-y-6">
              <div className="py-4">
                <p className="text-2xl font-black leading-relaxed" style={{ color: theme.dark }}>
                  「{currentQuote.content}」
                </p>
                <p className="text-xl font-black mt-4" style={{ color: theme.green }}>
                  — {currentQuote.author}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={onDraw} 
                  style={{ backgroundColor: theme.green }}
                  className="flex-1 text-white cursor-pointer py-3 rounded-2xl font-black shadow-[0_4px_0px_0px_#a5bc28] active:translate-y-1 active:shadow-none transition-all"
                >
                  🔄 再抽一張
                </button>
                
                {/* 收藏按鈕：點擊後會切換 collection 陣列 */}
                <button 
                  onClick={() => onOpenCollection(currentQuote.id)} 
                  className="w-16 flex cursor-pointer items-center justify-center rounded-2xl border-4 border-black text-2xl transition-all active:scale-90"
                  style={{ 
                    backgroundColor: '#fff', 
                    color: isFavorite ? '#fff' : '#ff4757',
                    borderColor: '#ff4757'
                  }}
                >
                  {isFavorite ? '❤️' : '🤍'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}