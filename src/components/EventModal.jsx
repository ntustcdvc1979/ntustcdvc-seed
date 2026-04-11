import React from 'react';
import { theme } from '../styles/theme';

// 解析連結的 function
const renderDescription = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" 
           className="text-blue-500 underline font-black hover:text-blue-700 break-all">
          [點擊連結]
        </a>
      );
    }
    return part;
  });
};

export default function EventModal({ events, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-[3rem] w-full max-w-sm max-h-[80vh] overflow-y-auto border-4 p-8 relative" style={{ borderColor: theme.green }}>
        <button onClick={onClose} className="absolute top-6 right-6 font-black text-2xl" style={{ color: theme.dark }}>
          ✕
        </button>
        <h3 className="text-3xl font-black mb-8 border-b-4 pb-2" style={{ borderColor: theme.yellow, color: theme.dark }}>
          近期活動
        </h3>
        
        <div className="space-y-10">
          {events.length > 0 ? events.map((ev, idx) => (
            <div key={idx} className="space-y-6 border-b-2 border-black pb-8 last:border-0">
              
              {ev.posterUrl && ev.posterUrl.trim() !== "" && (
                <div className="w-full bg-gray-50 rounded-xl overflow-hidden border-2 border-black">
                  <img 
                    src={ev.posterUrl} 
                    alt={ev.title} 
                    className="w-full h-auto block"
                    loading="lazy"
                    onError={(e) => { 
                      e.target.parentNode.style.display = 'none'; 
                    }}
                  />
                </div>
              )}

              <h4 className="text-2xl font-black leading-tight" style={{ color: theme.dark }}>{ev.title}</h4>
              
              <p 
                className="text-xs text-left font-bold text-gray-800 leading-relaxed" 
                style={{ 
                  whiteSpace: 'pre-wrap', 
                  wordBreak: 'break-word',
                  color: theme.dark
                }}
              >
                {renderDescription(ev.description)}
              </p>
            </div>
          )) : (
            <p className="font-bold text-gray-400">目前尚無活動訊息...</p>
          )}
        </div>
      </div>
    </div>
  );
}