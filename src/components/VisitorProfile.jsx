import React from 'react';
import SeedGrowth from './SeedGrowth';
import Badge from './Badge';
import { getTitleConfig } from '../utils/gameLogic';
import { theme } from '../styles/theme';

export default function VisitorProfile({ visitorData }) {
  const titleConfig = getTitleConfig(visitorData);

  return (
    <div className="relative h-full w-full animate-in fade-in duration-500">
      {/* 參觀者視角：SeedGrowth 會自動處理背景圖切換 */}
      <SeedGrowth exp={visitorData.exp || 0} isOwner={false} />
      
      {/* 覆蓋在背景上的勳章牆 */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-start pt-32 px-6">
        <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-6 border-4 border-black w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-base font-black opacity-30 mb-4 text-center uppercase tracking-widest" style={{ color: theme.dark }}>
            {visitorData.name} 的成就勳章
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {titleConfig
              .filter((t) => visitorData.badges?.includes(t.name))
              .map((t) => (
                <Badge key={t.name} badgeData={t} />
              ))}
            {(!visitorData.badges || visitorData.badges.length === 0) && (
              <p className="text-gray-400 text-sm font-bold italic py-4">尚未解鎖任何成就</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}