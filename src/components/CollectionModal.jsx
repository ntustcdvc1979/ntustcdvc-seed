import React from 'react';
import { theme } from '../styles/theme';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../firebase-config';

export default function CollectionModal({ collection, favorite, allQuotes, onClose, setUserData }) {
  const myHistoryQuotes = allQuotes.filter(q => collection?.includes(q.id));

  const handleToggleFavorite = async (quoteId) => {
    if (!auth.currentUser) return;
    const isFav = favorite?.includes(quoteId);
    const userRef = doc(db, 'users', auth.currentUser.uid);

    try {
      if (isFav) {
        await updateDoc(userRef, { favorite: arrayRemove(quoteId) });
        setUserData(prev => ({
          ...prev,
          favorite: prev.favorite.filter(id => id !== quoteId)
        }));
      } else {
        await updateDoc(userRef, { favorite: arrayUnion(quoteId) });
        setUserData(prev => ({
          ...prev,
          favorite: [...(prev.favorite || []), quoteId]
        }));
      }
    } catch (err) {
      console.error("更新收藏失敗:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div className="bg-white w-full max-w-sm rounded-[3rem] border-4 p-8 relative max-h-[80vh] flex flex-col" style={{ borderColor: theme.yellow }}>
        <button onClick={onClose} className="absolute top-6 right-6 text-2xl font-black cursor-pointer hover:opacity-50 transition-opacity">✕</button>
        
        <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
          <span>📚</span> 智慧錦囊
        </h3>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {myHistoryQuotes.map((q, index) => {
            const isFav = favorite?.includes(q.id);

            return (
              <div 
                key={index} 
                onClick={() => handleToggleFavorite(q.id)} // 點擊卡片切換收藏
                className={`p-4 rounded-2xl border-2 transition-all relative cursor-pointer active:scale-95 ${
                  isFav 
                    ? 'border-[#ff4757] bg-red-50/30 shadow-sm' 
                    : 'border-dashed border-gray-200 bg-gray-50/10'
                }`}
              >
                <div className="absolute top-2 right-3 flex items-center gap-1">
                   <span className={`text-xs ${isFav ? 'animate-pulse' : 'grayscale opacity-30'}`}>❤️</span>
                </div>
                
                <p className={`text-sm font-bold mb-2 ${isFav ? 'text-black' : 'text-gray-500'}`}>
                  「{q.content}」
                </p>
                <p className="text-xs font-black text-right" style={{ color: theme.green }}>— {q.author}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}