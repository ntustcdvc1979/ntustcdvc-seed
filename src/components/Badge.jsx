import React, { useState } from 'react';
import { BadgeImages } from '../assets/AssetManager';
import { theme } from '../styles/theme';

export default function Badge({ badgeData, isDirectOpen = false, onClose, isClickable = true }) {
  const [isZoomed, setIsZoomed] = useState(isDirectOpen);
  const { name, description, isEarned } = badgeData;
  const imgSrc = BadgeImages[name];

  const handleBadgeClick = () => {
    if (isClickable) {
      setIsZoomed(true);
    }
  };

  return (
    <>
      <div 
        onClick={handleBadgeClick}
        className="flex flex-col items-center group cursor-pointer active:scale-95 transition-all"
      >
        {/* 成就圖 */}
        <img 
          src={imgSrc} 
          alt={name} 
          // 根據是否已獲得 (isEarned) 來決定是否加上灰色濾鏡
          className={`w-24 h-24 object-contain transition-all duration-500 ${isEarned ? '' : 'grayscale opacity-30'}`} 
        />
      </div>

      {/* 放大後的 Lightbox */}
      {isZoomed && isClickable && (
        <div 
          className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-8 animate-in fade-in duration-300"
          onClick={() => {
            setIsZoomed(false);
            onClose && onClose();
          }}
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