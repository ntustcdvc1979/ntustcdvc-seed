import React from 'react';
import { godText } from '../assets/AssetManager';

export const renderContent = (text) => {
  const keyword = "<中>";
    if (!text.includes(keyword)) return text;

    // 使用 split 將字串分割，並在關鍵字處插入圖片
    return text.split(keyword).map((part, index, array) => (
      <React.Fragment key={index}>
        {part}
        {index < array.length - 1 && (
          <img
            src={godText}
            alt={keyword}
            className="inline-flex items-center justify-center h-6 w-6 mx-1" // 調整大小與對齊
          />
        )}
      </React.Fragment>
    ));
  };