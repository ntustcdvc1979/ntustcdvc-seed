import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase-config';
import { collection, query, where, getDocs, limit, doc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { theme } from '../styles/theme';

export default function FriendList({ currentUser, onVisit, onClose, setUserData }) {
  const [searchInput, setSearchInput] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [followingList, setFollowingList] = useState([]);
  const [statusMsg, setStatusMsg] = useState({ text: '', color: '' });

  useEffect(() => {
    if (statusMsg.text) {
      const timer = setTimeout(() => setStatusMsg({ text: '', color: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!currentUser?.following || currentUser.following.length === 0) {
        setFollowingList([]);
        return;
      }
      try {
        const q = query(collection(db, 'users'), where("__name__", "in", currentUser.following));
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        setFollowingList(docs);
      } catch (err) {
        console.error("抓取追蹤名單失敗:", err);
      }
    };
    fetchFollowing();
  }, [currentUser]);

  const handleSearch = async () => {
    const term = searchInput.trim().toLowerCase();
    if (!term) return;
    if (term === currentUser?.shortId?.toLowerCase()) {
      setSearchResult(null);
      return;
    }
    
    setIsSearching(true);
    try {
      const q = query(collection(db, 'users'), where("shortId", "==", term), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setSearchResult({ uid: snapshot.docs[0].id, ...data });
        setStatusMsg({ text: "搜尋成功！", color: "text-green-500" });
      } else {
        setSearchResult(null);
        setStatusMsg({ text: "找不到這位朋友哦！", color: "text-red-500" });
      }
    } catch (err) {
      setStatusMsg({ text: "搜尋出錯", color: "text-red-500" });
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFollow = async (targetUser) => {
    if (!currentUser || !auth.currentUser) return;
    const myUid = auth.currentUser.uid;
    const userRef = doc(db, 'users', myUid);
    const myFollowing = currentUser.following || [];
    const isFollowing = myFollowing.includes(targetUser.uid);

    try {
      await setDoc(userRef, { 
        following: isFollowing ? arrayRemove(targetUser.uid) : arrayUnion(targetUser.uid) 
      }, { merge: true });

      if (setUserData) {
        setUserData(prev => ({
          ...prev,
          following: isFollowing 
            ? prev.following.filter(id => id !== targetUser.uid) 
            : [...(prev.following || []), targetUser.uid]
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = () => {
    if (!currentUser?.shortId) return;
    navigator.clipboard.writeText(currentUser.shortId);
    
    // 利用我們現有的 statusMsg 來顯示回饋
    setStatusMsg({ text: "ID 已複製到剪貼簿！", color: "text-[#bad32d]" });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-left">
      <div className="bg-white rounded-[3rem] w-full max-w-sm max-h-[85vh] p-8 border-4 border-black animate-in fade-in zoom-in duration-300 flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black italic">朋友圈</h3>
          <button onClick={onClose} className="text-xl font-black p-2 cursor-pointer hover:opacity-50 transition-opacity">✕</button>
        </div>

        {/* Search Bar Area */}
        <div className="mb-4">
          <div className="flex items-center gap-2 w-full">
            <input 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="輸入 6 碼 ID..."
              maxLength={6}
              className="flex-1 min-w-0 border-2 border-black rounded-2xl px-4 py-2.5 font-black text-base focus:outline-none bg-gray-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            />
            <button 
              onClick={handleSearch}
              disabled={isSearching}
              className="w-11 h-11 rounded-full bg-white border-2 border-black flex items-center justify-center text-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all flex-shrink-0"
            >
              {isSearching ? ".." : "🔍"}
            </button>
          </div>
          <div className={`h-4 mt-1 text-xs font-black px-2 ${statusMsg.color} transition-all duration-300`}>
            {statusMsg.text}
          </div>
        </div>

        {/* 功能 2: 搜尋結果區 - 縮減上下空白 */}
        {searchResult && (
          <div className="mb-4 p-3 border-2 border-black rounded-2xl bg-[#bad32d]/10 flex justify-between items-center gap-3 animate-in slide-in-from-top-2 duration-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-black text-base truncate flex-1 ml-1">{searchResult.name}</p>
            <div className="flex gap-2 flex-shrink-0">
              <button 
                onClick={() => toggleFollow(searchResult)}
                style={{ 
                  backgroundColor: currentUser.following?.includes(searchResult.uid) ? theme.yellow : theme.green,
                  boxShadow: `2px 2px 0px 0px rgba(0,0,0,1)` 
                }}
                className="border-2 border-black text-white px-3 py-1 rounded-xl font-black text-xs active:translate-y-0.5 active:shadow-none transition-all"
              >
                {currentUser.following?.includes(searchResult.uid) ? "取消" : "追蹤"}
              </button>
              <button 
                onClick={() => onVisit(searchResult)}
                className="bg-[#bad32d] text-white border-2 border-black px-3 py-1 rounded-xl font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
              >
                參觀
              </button>
            </div>
          </div>
        )}

        <hr className="border border-dashed border-gray-200 mb-5" />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">我的追蹤 ({followingList.length})</p>
            <div className="space-y-3 pb-4">
              {followingList.length > 0 ? followingList.map((friend) => (
                <div key={friend.uid} className="p-3 border-2 border-black rounded-2xl flex justify-between items-center bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <p className="font-black text-sm truncate flex-1 ml-1">{friend.name}</p>
                  <div className="flex gap-2 ml-4">
                    <button 
                      onClick={() => toggleFollow(friend)}
                      className="bg-[#f5be30] text-white border-2 border-black px-3 py-1 rounded-xl font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
                    >
                      取消
                    </button>
                    <button 
                      onClick={() => onVisit(friend)}
                      className="bg-[#bad32d] text-white border-2 border-black px-3 py-1 rounded-xl font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
                    >
                      參觀
                    </button>
                  </div>
                </div>
              )) : (
                <p className="text-gray-400 text-xs font-bold italic text-center py-6">目前還沒有追蹤的朋友...</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-100 text-center flex-shrink-0">
          <p className="text-xs font-black text-gray-400 uppercase tracking-tighter">我的個人ID</p>
          <div 
            onClick={copyToClipboard}
            className="cursor-pointer group relative inline-block"
          >
            <p className="text-2xl font-black text-[#bad32d] tracking-tighter transition-transform group-active:scale-95 leading-tight">
              {currentUser?.shortId}
            </p>
          </div>
          <p className="text-xs font-black text-gray-400 mt-1">點擊上方ID即可複製分享</p>
        </div>
      </div>
    </div>
  );
}