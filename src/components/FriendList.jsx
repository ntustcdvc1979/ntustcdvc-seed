import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase-config';
import { collection, query, where, getDocs, limit, doc, setDoc, arrayUnion, arrayRemove, orderBy } from 'firebase/firestore';

export default function FriendList({ currentUser, onVisit, onClose, setUserData }) {
  const [searchInput, setSearchInput] = useState('');
  const [followingList, setFollowingList] = useState([]); // 已追蹤名單
  const [topPlayers, setTopPlayers] = useState([]);       // 前20名高等級玩家
  const [loading, setLoading] = useState(true);

  // 核心邏輯：初始化載入資料
  useEffect(() => {
    const initListData = async () => {
      setLoading(true);
      try {
        // 1. 載入已追蹤名單
        let followedDocs = [];
        if (currentUser?.following && currentUser.following.length > 0) {
          const qFollow = query(
            collection(db, 'users'), 
            where("__name__", "in", currentUser.following)
          );
          const snapFollow = await getDocs(qFollow);
          followedDocs = snapFollow.docs.map(d => ({ uid: d.id, ...d.data() }));
          // 按等級排序
          followedDocs.sort((a, b) => (b.exp || 0) - (a.exp || 0));
        }
        setFollowingList(followedDocs);

        // 2. 載入前 20 名等級最高玩家 (排除自己)
        const qTop = query(collection(db, 'users'), orderBy("exp", "desc"), limit(25)); // 稍微多抓一點以防扣除自己後不足20
        const snapTop = await getDocs(qTop);
        const topDocs = snapTop.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter(u => u.uid !== auth.currentUser?.uid) // 排除自己
          .slice(0, 20); // 取前20名
        
        setTopPlayers(topDocs);
      } catch (err) {
        console.error("初始化資料失敗:", err);
      } finally {
        setLoading(false);
      }
    };

    initListData();
  }, [currentUser?.following]); // 當追蹤名單異動時重新整理

  // 搜尋邏輯：針對現有資料進行前端過濾
  const getFilteredList = (list) => {
    return list.filter(u => 
      u.name.toLowerCase().includes(searchInput.toLowerCase())
    );
  };

  const toggleFollow = async (targetUser) => {
    if (!currentUser || !auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const isFollowing = currentUser.following?.includes(targetUser.uid);

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

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-left">
      <div className="bg-white rounded-[3rem] w-full max-w-sm max-h-[85vh] p-8 border-4 border-black flex flex-col overflow-hidden relative shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black italic">排行榜</h3>
          <button onClick={onClose} className="text-xl font-black p-2 cursor-pointer hover:opacity-50 transition-opacity">✕</button>
        </div>

        <div className="mb-4">
          <input 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜尋種子主人名字..."
            className="w-full border-2 border-black rounded-2xl px-4 py-2.5 font-black text-base focus:outline-none bg-gray-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
          {loading ? (
            <p className="text-center py-10 font-bold text-gray-400 animate-pulse">連線仙界中...</p>
          ) : (
            <>
              {/* 已追蹤區塊 */}
              {getFilteredList(followingList).length > 0 && (
                <div>
                  <p className="text-sm font-black text-gray-400 uppercase mb-3 tracking-widest ml-1">已追蹤</p>
                  <div className="space-y-3">
                    {getFilteredList(followingList).map((player) => (
                      <UserCard key={player.uid} player={player} isFollowing={true} toggleFollow={toggleFollow} onVisit={onVisit} />
                    ))}
                  </div>
                </div>
              )}

              {/* 等級排行區塊 (推薦) */}
              <div>
                <p className="text-sm font-black text-gray-400 uppercase mb-3 tracking-widest ml-1">等級排行榜</p>
                <div className="space-y-3">
                  {getFilteredList(topPlayers).length > 0 ? (
                    getFilteredList(topPlayers).map((player) => {
                      const isFollowing = currentUser.following?.includes(player.uid);
                      // 如果已經追蹤了，就不在排行榜重複顯示
                      if (isFollowing) return null;
                      return <UserCard key={player.uid} player={player} isFollowing={false} toggleFollow={toggleFollow} onVisit={onVisit} />;
                    })
                  ) : (
                    <p className="text-gray-400 text-center py-4 font-bold text-xs italic">無相符結果</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// 卡片組件保持不變，包含等級顯示
function UserCard({ player, isFollowing, toggleFollow, onVisit }) {
  const level = Math.floor((player.exp || 0) / 5) + 1;
  
  return (
    <div className="p-3 border-2 border-black rounded-2xl flex justify-between items-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex flex-col ml-1">
        <p className="font-black text-sm truncate max-w-[120px]">{player.name}</p>
        <span className="text-sm font-bold text-[#bad32d]">LV.{level}</span>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => toggleFollow(player)}
          className="border-2 border-black cursor-pointer px-3 py-1 rounded-xl font-black text-sm"
          style={{ backgroundColor: isFollowing ? '#f5be30' : '#bad32d', color: 'white' }}
        >
          {isFollowing ? "取消" : "追蹤"}
        </button>
        <button 
          onClick={() => onVisit(player)}
          className="bg-white border-2 border-black cursor-pointer px-3 py-1 rounded-xl font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        >
          參觀
        </button>
      </div>
    </div>
  );
}