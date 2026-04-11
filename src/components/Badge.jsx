import React, { useState } from 'react';
import { BadgeImages } from '../assets/AssetManager';
import { theme } from '../styles/theme';

// 接收 title 物件，裡面包含 name 和 description
export default function Badge({ badgeData }) {
  const [isZoomed, setIsZoomed] = useState(false);
  const { name, description } = badgeData;
  const imgSrc = BadgeImages[name];

  return (
    <>
      <div 
        onClick={() => setIsZoomed(true)}
        className="flex flex-col items-center group cursor-pointer active:scale-95 transition-all"
      >
        <div className="w-20 h-20 flex items-center justify-center">
          {imgSrc ? (
            <img 
              src={imgSrc} 
              alt={name} 
              className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]" 
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-black border-4 border-white flex items-center justify-center">
              <span className="text-[10px] text-white font-black">{name}</span>
            </div>
          )}
        </div>

        <div 
          className="mt-1 text-[13px] font-black px-3 py-1 rounded shadow-sm border border-white transform -rotate-1"
          style={{ backgroundColor: theme.green, color: '#fff' }}
        >
          {name}
        </div>
      </div>

      {/* 放大後的 Lightbox */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-8 animate-in fade-in duration-300"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative flex flex-col items-center max-w-xs animate-in zoom-in duration-300">
            <img 
              src={imgSrc} 
              alt={name} 
              className="w-64 h-64 object-contain drop-shadow-[0_0_25px_rgba(245,190,48,0.6)]" 
            />
            
            <div className="mt-10 text-center space-y-4">
              <h2 className="text-4xl font-black" style={{ color: theme.yellow }}>
                {name}
              </h2>
              
              {/* 顯示該勳章獨有的意義 */}
              <p className="text-lg font-bold text-white leading-relaxed tracking-wide italic" style={{ whiteSpace: 'pre-wrap' }}>
                「{description || "成就解鎖！持續精進，點亮心燈。"}」
              </p>
            </div>

            <button className="mt-12 text-gray-400 text-sm font-black border-b border-gray-400">
              點擊任意處關閉
            </button>
          </div>
        </div>
      )}
    </>
  );
}