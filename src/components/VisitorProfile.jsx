import React, { useState } from 'react';
import SeedGrowth from './SeedGrowth';
import Badge from './Badge';
import { getTitleConfig } from '../utils/gameLogic';
import { theme } from '../styles/theme';

export default function VisitorProfile({ visitorData }) {
  // 控制勳章列表展開的狀態
  const [showBadges, setShowBadges] = useState(false);
  const titleConfig = getTitleConfig(visitorData);
  
  // 篩選出該訪客擁有的勳章
  const earnedBadges = titleConfig.filter((t) => visitorData.badges?.includes(t.name));

  return (
    <div className="relative h-full w-full animate-in fade-in duration-500">
      {/* 參觀者視角核心展示 */}
      <SeedGrowth exp={visitorData.exp || 0} isOwner={false} />
      
      {/* 頂部功能區域：勳章展開按鈕 */}
      <div className="absolute top-24 left-0 w-full z-40 px-6 flex justify-center">
        <div className="flex flex-col items-center gap-4 w-full max-w-[320px]">
          
          {/* 展開按鈕 */}
          <button 
            onClick={() => setShowBadges(!showBadges)}
            className="bg-white border-4 border-black cursor-pointer px-6 py-2 rounded-full font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2 group"
          >
            <span className="text-lg group-hover:rotate-12 transition-transform">🏆</span>
            <span style={{ color: theme.dark }}>
              {visitorData.name} 的成就 ({earnedBadges.length})
            </span>
            <span className={`ml-2 transition-transform duration-300 ${showBadges ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {/* 展開的勳章牆 */}
          {showBadges && (
            <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] p-6 border-4 border-black w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-top-4 duration-300">
              <div className="flex flex-wrap gap-4 justify-center">
                {earnedBadges.length > 0 ? (
                  earnedBadges.map((t) => (
                    <div key={t.name} className="transform scale-90">
                      <Badge
                        badgeData={{ ...t, isEarned: true }}
                        isClickable={false}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-xs font-bold italic py-2">
                    這位種子主人還在努力中...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}