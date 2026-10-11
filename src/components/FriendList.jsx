import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase-config';
import { collection, query, where, getDocs, limit, doc, setDoc, arrayUnion, arrayRemove, orderBy, documentId } from 'firebase/firestore';

// Firestore 的 "in" 查詢一次最多只能帶 30 個值，追蹤人數超過就要分批查
const IN_QUERY_LIMIT = 30;
// 關掉排行榜再打開時，這段時間內沿用剛剛讀到的資料，不必每次重讀
const CACHE_MS = 5 * 60 * 1000;

// 同一次使用網頁期間共用的快取
const cache = {
  top: null,          // 前 20 名
  topAt: 0,
  users: new Map(),   // uid → { data, at }
};

const chunk = (list, size) => {
  const result = [];
  for (let i = 0; i < list.length; i += size) result.push(list.slice(i, i + size));
  return result;
};

const byExp = (a, b) => (b.exp || 0) - (a.exp || 0);
const isFresh = (at) => Date.now() - at < CACHE_MS;

const rememberUsers = (players) => {
  const now = Date.now();
  players.forEach((p) => cache.users.set(p.uid, { data: p, at: now }));
};

async function loadTopPlayers() {
  if (cache.top && isFresh(cache.topAt)) return cache.top;
  const snap = await getDocs(query(collection(db, 'users'), orderBy('exp', 'desc'), limit(20)));
  cache.top = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  cache.topAt = Date.now();
  rememberUsers(cache.top);
  return cache.top;
}

/** 只讀取快取裡還沒有（或太舊）的追蹤對象 */
async function loadFollowedPlayers(ids) {
  const missing = ids.filter((id) => !isFresh(cache.users.get(id)?.at ?? 0));
  if (missing.length > 0) {
    const snapshots = await Promise.all(
      chunk(missing, IN_QUERY_LIMIT).map(batch =>
        getDocs(query(collection(db, 'users'), where(documentId(), 'in', batch)))
      )
    );
    rememberUsers(snapshots.flatMap(snap => snap.docs.map(d => ({ uid: d.id, ...d.data() }))));
  }
  return ids.map((id) => cache.users.get(id)?.data).filter(Boolean).sort(byExp);
}

export default function FriendList({ currentUser, onVisit, onClose, setUserData }) {
  const [searchInput, setSearchInput] = useState('');
  const [followingList, setFollowingList] = useState([]); // 已追蹤名單
  const [topPlayers, setTopPlayers] = useState([]);       // 前20名高等級玩家
  const [loading, setLoading] = useState(true);
  // 只在打開時讀一次；之後追蹤 / 取消追蹤直接更新畫面，不再重新讀取整份名單
  const initialFollowing = useRef(currentUser?.following || []);

  useEffect(() => {
    let isMounted = true;

    // 先讀前 20 名，追蹤名單裡已經在前 20 名的人就不用另外讀
    loadTopPlayers()
      .then(async (top) => {
        const followed = await loadFollowedPlayers(initialFollowing.current);
        if (!isMounted) return;
        setTopPlayers(top);
        setFollowingList(followed);
      })
      .catch((err) => console.error("初始化資料失敗:", err))
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, []);

  // 搜尋邏輯：針對現有資料進行前端過濾（部分舊資料沒有 name 欄位，要防呆）
  const getFilteredList = (list) => {
    const keyword = searchInput.trim().toLowerCase();
    if (!keyword) return list;
    return list.filter(u => (u.name || '').toLowerCase().includes(keyword));
  };

  const toggleFollow = async (targetUser) => {
    if (!currentUser || !auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const isFollowing = currentUser.following?.includes(targetUser.uid);

    try {
      await setDoc(userRef, {
        following: isFollowing ? arrayRemove(targetUser.uid) : arrayUnion(targetUser.uid)
      }, { merge: true });

      // 手上已經有對方的資料，直接更新畫面
      setFollowingList(prev => isFollowing
        ? prev.filter(p => p.uid !== targetUser.uid)
        : [...prev, targetUser].sort(byExp));

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
  // 判斷是否為使用者本人
  const isMe = player.uid === auth.currentUser?.uid;
  
  return (
    <div className="p-3 border-2 border-black rounded-2xl flex justify-between items-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex flex-col ml-1">
        <p className="font-black text-sm truncate max-w-[120px]">{player.name || "未知用戶"} {isMe && "(你)"}</p>
        <span className="text-sm font-bold text-[#bad32d]">LV.{level}</span>
      </div>
      <div className="flex gap-2">
        {!isMe && (
          // 如果是別人，才顯示按鈕
          <>
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
          </>
        )}
      </div>
    </div>
  );
}