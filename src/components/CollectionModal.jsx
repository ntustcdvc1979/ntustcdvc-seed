import React from 'react';
import { theme } from '../styles/theme';

export default function CollectionModal({ collection, allQuotes, onClose }) {
  const myQuotes = allQuotes.filter(q => collection.includes(q.id));

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div 
        className="bg-white w-full max-w-sm rounded-[3rem] border-4 p-8 relative max-h-[80vh] flex flex-col"
        style={{ borderColor: theme.yellow }}
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-2xl font-black">✕</button>
        
        <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
          <span>📚</span> 智慧錦囊
        </h3>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {myQuotes.length === 0 ? (
            <p className="text-center text-gray-400 py-10 font-bold">目前還沒有收藏喔，快去抽一張吧！</p>
          ) : (
            myQuotes.map((q, index) => (
              <div key={index} className="p-4 rounded-2xl border-2 border-dashed border-gray-200">
                <p className="text-sm font-bold mb-2">「{q.content}」</p>
                <p className="text-xs font-black text-right" style={{ color: theme.green }}>— {q.author}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}