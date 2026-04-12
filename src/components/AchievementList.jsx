import React from 'react';
import { BadgeImages } from '../assets/AssetManager';
import { theme } from '../styles/theme';

export default function AchievementList({ titleConfig, earnedBadges, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
      {/* 修正處：邊框改為黑色，並與其他 Modal 寬度對齊 */}
      <div 
        className="bg-white rounded-[3rem] w-full max-w-[400px] max-h-[80vh] overflow-y-auto border-4 border-black p-8 relative animate-in zoom-in duration-300 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
        style={{ borderColor: theme.yellow }}
      >
        {/* 關閉按鈕 */}
        <button onClick={onClose} className="absolute cursor-pointer hover:opacity-50 transition-opacity top-6 right-6 font-black text-2xl" style={{ color: theme.dark }}>
          ✕
        </button>

        {/* 標題 */}
        <h3 className="text-3xl font-black mb-8 border-b-4 pb-2" style={{ borderColor: theme.green, color: theme.dark }}>
          成就解鎖
        </h3>
        
        <div className="space-y-6">
          {titleConfig.map((badge) => {
            const isEarned = earnedBadges.includes(badge.name);
            
            return (
              <div 
                key={badge.name} 
                className="flex items-center gap-5 p-4 rounded-2xl border-2 border-black transition-all"
                style={{ 
                  backgroundColor: isEarned ? '#fff' : '#f9f9f9',
                  opacity: isEarned ? 1 : 0.8
                }}
              >
                {/* 勳章圖示區 */}
                <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
                  {isEarned ? (
                    <img src={BadgeImages[badge.name]} alt="圖片未完成" className="w-full h-full object-contain" />
                  ) : badge.isHidden ? (
                    /* 隱藏成就：黑色問號 */
                    <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-white text-2xl font-black shadow-inner">
                      ?
                    </div>
                  ) : (
                    /* 一般成就：灰色圖示 */
                    <img src={BadgeImages[badge.name]} alt="圖片未完成" className="w-full h-full object-contain grayscale opacity-30" />
                  )}
                </div>

                {/* 成就說明區 */}
                <div className="flex-1">
                  <h4 className="text-lg font-black leading-tight" style={{ color: theme.dark }}>
                    {isEarned || !badge.isHidden ? badge.name : "？？？？"}
                  </h4>
                  <p className="text-[11px] font-bold mt-1 text-gray-500 leading-tight">
                    {/* 邏輯：已達成或非隱藏則顯示目標，否則顯示問號 */}
                    {isEarned || !badge.isHidden ? `達成條件：${badge.goal}` : "達成條件：尚未解鎖隱藏線索..."}
                  </p>
                </div>

                {/* 狀態標記 */}
                {isEarned && (
                  <div className="text-[10px] font-black text-[#bad32d]">✔</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}