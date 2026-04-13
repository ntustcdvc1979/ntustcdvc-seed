import React from 'react';
import { BadgeImages } from '../assets/AssetManager';
import Badge from './Badge.jsx'
import { theme } from '../styles/theme';

export default function AchievementList({ titleConfig, earnedBadges, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
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
          成就勳章
        </h3>
        
        <div className="space-y-6">
          {titleConfig.map((badge) => {
            const isEarned = earnedBadges.includes(badge.name);
            
            // 構建傳給 Badge 元件的資料，包含當前是否已達成的狀態
            const displayData = {
              ...badge,
              isEarned: isEarned // 這會控制 Badge 的灰色濾鏡
            };

            return (
              <div 
                key={badge.name} 
                className="flex items-center gap-2 p-4 rounded-2xl border-2 border-black/5 bg-gray-50/50"
              >
                {/* 勳章圖示區：塞入 w-24 h-24 的框框內 */}
                <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center rounded-full bg-white">
                  {badge.isHidden && !isEarned ? (
                    /* 1. 隱藏成就 (未完成)：黑色問號，不能點擊 */
                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white text-2xl font-black shadow-inner">
                      ?
                    </div>
                  ) : (
                    <Badge 
                      badgeData={displayData} 
                      isClickable={isEarned} 
                    />
                  )}
                </div>

                {/* 成就說明區 */}
                <div className="flex-1">
                  <h4 className="text-lg font-black leading-tight" style={{ color: theme.dark }}>
                    {isEarned || !badge.isHidden ? badge.name : "？？？？"}
                  </h4>
                  <p className="text-sm font-bold mt-1 text-gray-500 leading-tight">
                    {isEarned || !badge.isHidden ? `達成條件：${badge.goal}` : "達成條件：尚未解鎖隱藏線索..."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}