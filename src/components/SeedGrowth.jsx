import React from 'react';
// 引入四階段圖片
import SeedImg from '../assets/seed.webp';
import SproutImg from '../assets/sprout.webp';
import GrowthImg from '../assets/growth.webp';
import BudImg from '../assets/bud.webp';
import BloomImg from '../assets/bloom.webp';

export default function SeedGrowth({ exp = 0, isOwner }) {
  const getStageData = (exp) => {
    if (exp >= 60) return { img: BloomImg, stage: "綻放" };
    if (exp >= 45) return { img: BudImg, stage: "含苞待放" };
    if (exp >= 15) return { img: GrowthImg, stage: "成長" };
    if (exp >= 5)  return { img: SproutImg, stage: "幼苗" };
    return { img: SeedImg, stage: "種子" };
  };

  const stage = getStageData(exp);

  return (
    <div className="relative h-full w-full">
      {/* 1. 背景層：占滿整個父容器 */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out animate-in fade-in"
        style={{ backgroundImage: `url(${stage.img})` }}
      />

      {/* 2. UI 層：資訊懸浮 */}
      <div className="relative z-20 flex flex-col items-center h-full w-full">
        {isOwner && (
          <div className="mt-70 animate-bounce text-4xl opacity-80 drop-shadow-md">💧</div>
        )}
        
        {/* 底部等級資訊 - 移到下方確保不擋住圖片中心 */}
        <div className="mt-auto mb-32 flex flex-col items-center bg-white/30 backdrop-blur-md p-4 rounded-[2rem] border border-white/20 shadow-lg">
          <div className="bg-black text-white px-4 py-1 rounded-full text-[10px] font-black tracking-widest mb-1">
            LV. {Math.floor(exp / 5) + 1}
          </div>
          <h3 className="text-lg font-black text-black">{stage.stage}階段</h3>
          
          <div className="w-24 h-1 bg-black/10 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-[#bad32d] transition-all duration-1000" 
              style={{ width: `${(exp % 5) * 20}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}