import React, { useState, useEffect, useRef, useMemo } from 'react';
import BadgeUnlockModal from './components/BadgeUnlockModal';
import { auth, db, provider } from './firebase-config';
import { signInWithPopup, signOut, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs } from 'firebase/firestore';
import { FaInstagram, FaFacebook, FaLine } from 'react-icons/fa';
import BackgroundImg from './assets/background.webp';

import DailyQuote from './components/DailyQuote'
import EventModal from './components/EventModal';
import SkillTree from './components/SkillTree';
import CollectionModal from './components/CollectionModal';
import AchievementList from './components/AchievementList';
import SeedGrowth from './components/SeedGrowth'; 
import FriendList from './components/FriendList';
import VisitorProfile from './components/VisitorProfile';
import SettingsModal from './components/SettingsModal';
import { getTitleConfig } from './utils/gameLogic';
import { Logos } from './assets/AssetManager';
import { theme } from './styles/theme';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [showEvents, setShowEvents] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(null);
  const [events, setEvents] = useState([]);
  const [showCollection, setShowCollection] = useState(false);
  const [allQuotes, setAllQuotes] = useState([]);
  const [unlockedBadgeName, setUnlockedBadgeName] = useState(null);
  const hasInitializedBadges = useRef(false);
  const prevBadgeNamesRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [showAchievementList, setShowAchievementList] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [showFriendList, setShowFriendList] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const titleConfig = useMemo(() => getTitleConfig(userData), [userData]);

  // 比對今天日期與資料庫紀錄的日期
  const hasWateredToday = useMemo(() => {
    const today = new Date().toLocaleDateString();
    return userData?.lastCheckIn === today;
  }, [userData?.lastCheckIn]);

  const openEventModal = async () => {
    const querySnapshot = await getDocs(collection(db, 'events'));
    setEvents(querySnapshot.docs.map(doc => doc.data()));
    setShowEvents(true);
  };

  const fetchUserData = async (uid) => {
    const userRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userRef);
    const currentUser = auth.currentUser;

    const defaultStats = { 
      誦經: 0, 抄寫經典: 0, 參與研究班: 0, 研讀聖訓經典: 0,
      蔬食一餐: 0, 覺察情緒: 0, 每日反省: 0, 一千叩首: 0, 每日用三寶: 0, 初一十五獻供: 0, 整理環境: 0, 壇務工作: 0, 法會實務: 0, 轉念: 0, 佈施: 0, 忍辱: 0,
      活動帶朋友: 0, 分享好文: 0, 關心成全一個人: 0, 分享道在日常: 0,
      開伙幫廚: 0, 淨灘山志工: 0, 營隊志工: 0, 渡人求道: 0, 策畫結緣活動: 0,
    };

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (!data.name || !data.email || !data.shortId) {
        await updateDoc(userRef, {
          name: data.name || currentUser?.displayName || "未知用戶",
          email: data.email || currentUser?.email || "無信箱資訊",
          shortId: data.shortId || uid.substring(0, 6).toLowerCase(),
          exp: data.exp || 0
        });
      }
      setUserData({
        ...data,
        stats: { ...defaultStats, ...data.stats },
        badges: data.badges || [],
        collection: data.collection || [],
        favorite: data.favorite || [],
        shortId: data.shortId || uid.substring(0, 6).toLowerCase()
      });
    } else {
      const initial = {
        name: currentUser?.displayName || "未知用戶",
        email: currentUser?.email || "無信箱資訊",
        isTaoQin: true,
        stats: defaultStats,
        collection: [],
        favorite: [],
        badges: [],
        lastCheckIn: "",
        shortId: uid.substring(0, 6).toLowerCase(),
        exp: 0,
        following: [],
      };
      await setDoc(userRef, initial);
      setUserData(initial);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user && isMounted) {
          setUser(result.user);
          await fetchUserData(result.user.uid);
        }
      } catch (err) { console.error(err); }

      const unsubscribe = auth.onAuthStateChanged(async (u) => {
        if (isMounted) {
          if (u) {
            setUser(u);
            await fetchUserData(u.uid);
          } else {
            setUser(null);
            setUserData(null);
          }
          setLoading(false);
        }
      });

      try {
        const snapshot = await getDocs(collection(db, 'daily_quotes'));
        if (isMounted) {
          setAllQuotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (err) { console.error(err); }

      return unsubscribe;
    };
    initializeAuth();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!userData || !userData.stats || !user) return;
    const currentBadgeNames = titleConfig.filter((t) => t.requirement()).map((t) => t.name);
    if (!hasInitializedBadges.current) {
      prevBadgeNamesRef.current = currentBadgeNames;
      hasInitializedBadges.current = true;
      return;
    }
    const newBadges = currentBadgeNames.filter((name) => {
      return !(userData.badges && userData.badges.includes(name)) && !prevBadgeNamesRef.current.includes(name);
    });

    if (newBadges.length > 0) {
      const badgeToAnimate = newBadges[0];
      setUnlockedBadgeName(badgeToAnimate);
      updateDoc(doc(db, 'users', user.uid), { badges: arrayUnion(...newBadges) });
      setUserData(prev => ({ ...prev, badges: [...(prev.badges || []), ...newBadges] }));
    }
    prevBadgeNamesRef.current = currentBadgeNames;
  }, [userData, titleConfig, user]);

  const handleLogin = async () => {
    try {
      // 1. 不管手機還是電腦，先嘗試 Popup
      // 在很多現代 Android Chrome 版本中，如果點擊是直接觸發的，Popup 是會成功的
      await signInWithPopup(auth, provider);
    } catch (error) {
      // 2. 如果 Popup 被擋住 (blocked) 或出錯，再嘗試 Redirect
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        console.log("Popup 被攔截，切換至 Redirect...");
        signInWithRedirect(auth, provider).catch((redirectError) => {
          alert("無法跳轉，請聯絡管理員：" + redirectError.message);
        });
      } else {
        console.error("Login Error:", error);
      }
    }
  };

  const drawCard = async () => {
    if (allQuotes.length === 0 || !userData || !user) return;
    const today = new Date().toLocaleDateString();
    const hasWateredToday = userData.lastCheckIn === today;
    const newExp = hasWateredToday ? (userData.exp || 0) : (userData.exp || 0) + 1;
    
    const filtered = allQuotes.filter(item => userData?.isTaoQin ? true : item.type === 'non_Taoqin');
    if (filtered.length === 0) return;
    
    const randomQuote = filtered[Math.floor(Math.random() * filtered.length)];
    setCurrentQuote(randomQuote);

    const newCollection = Array.from(new Set([...(userData.collection || []), randomQuote.id]));
    
    setUserData(prev => ({ 
      ...prev, 
      collection: newCollection,
      exp: newExp, 
      lastCheckIn: today 
    }));

    await updateDoc(doc(db, 'users', user.uid), { 
      collection: arrayUnion(randomQuote.id), 
      exp: newExp,
      lastCheckIn: today 
    });
  };

  const incrementSkill = (skill) => {
    if (!userData) return;
    const newCount = (userData.stats[skill] || 0) + 1;
    setUserData({ ...userData, stats: { ...userData.stats, [skill]: newCount } });
    updateDoc(doc(db, 'users', user.uid), { [`stats.${skill}`]: newCount });
  };

  const decrementSkill = (skill) => {
    if (!userData || (userData.stats[skill] || 0) <= 0) return;
    const newCount = userData.stats[skill] - 1;
    setUserData({ ...userData, stats: { ...userData.stats, [skill]: newCount } });
    updateDoc(doc(db, 'users', user.uid), { [`stats.${skill}`]: newCount });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="w-12 h-12 border-4 border-[#bad32d] border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 font-black text-[#bad32d]">種子萌芽中...</p>
    </div>
  );

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="flex items-center gap-4 mb-4">
        <img src={Logos.Main} alt="Logo" className="h-20 object-contain" />
        <img src={Logos.Small} alt="Small Logo" className="h-12 object-contain" />
      </div>
      <h1 className="text-4xl font-black mb-8 text-black" style={{ color: '#000000' }}>🌱 崇德心靈種子</h1>
      <button onClick={handleLogin} className="bg-black text-white px-12 py-4 rounded-full font-bold">開啟探索</button>
    </div>
  );

  return (
    <div 
      className="min-h-screen w-full flex justify-center items-center bg-repeat bg-fixed" 
      style={{ 
        backgroundImage: `url(${BackgroundImg})`, 
        backgroundSize: '400px',
        backgroundPosition: 'center'
      }}
    >
      <div className="relative w-full max-w-[450px] aspect-[1536/2752] bg-transparent shadow-2xl overflow-hidden flex flex-col p-6 border-x-4 border-black/20 transition-all duration-700">
        
        <header className="relative z-30 flex justify-between items-start mb-2">
          <div className="flex flex-col items-start gap-1 max-w-[55%]">
            {viewingUser ? (
              <button onClick={() => setViewingUser(null)} className="mb-2 cursor-pointer bg-white border-2 border-black px-3 py-1 rounded-full font-black text-base shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5">
                ← 返回
              </button>
            ) : (
              // 點擊使用者名稱開啟設定
              <button 
                onClick={() => setShowSettings(true)}
                className="group flex flex-col items-start"
              >
                <h2 className="text-xl font-black truncate cursor-pointer bg-white/80 px-2 rounded-lg border-2 border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ color: theme.dark }}>
                  {user.displayName} ⚙️
                </h2>
              </button>
            )}
          </div>

          {!viewingUser && (
            <div className="flex flex-col items-end gap-3">
              <div className="flex gap-2">
                {[
                  { label: '成就', icon: '🏆', action: () => setShowAchievementList(true) },
                  { label: '慈語', icon: '📚', action: () => setShowCollection(true) },
                  { label: '活動', icon: '📅', action: openEventModal },
                  { label: '排行榜', icon: '👥', action: () => setShowFriendList(true) }
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action} className="flex flex-col items-center gap-1">
                    <div className="text-xl p-2 cursor-pointer bg-white/90 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all">
                      {btn.icon}
                    </div>
                    <span className="font-black text-sm px-1 rounded" style={{ color: theme.dark }}>{btn.label}</span>
                  </button>
                ))}
              </div>

              {/* 學修講辦 */}
              <div className="grid grid-cols-2 gap-2">
                {['學', '修', '講', '辦'].map((cat) => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className="flex flex-col items-center gap-0.5">
                    <div className="w-9 h-9 cursor-pointer rounded-full border-2 border-black bg-white/90 flex items-center justify-center text-base shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all">
                      {cat === '學' ? '📖' : cat === '修' ? '🙏' : cat === '講' ? '📢' : '🤝'}
                    </div>
                    <span className="font-black text-sm px-1 rounded" style={{ color: theme.dark }}>{cat}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* --- 核心展示區 --- */}
        <div className="absolute inset-0 z-10 h-full w-full">
          {!viewingUser ? (
            <SeedGrowth
              exp={userData?.exp}
              isOwner={true}
              hasWateredToday={hasWateredToday}
            />
          ) : (
            <VisitorProfile visitorData={viewingUser} />
          )}
        </div>

        <footer className="relative z-30 mt-auto pb-6 flex items-center justify-center">
          {!viewingUser && (
            <div className="w-full flex justify-center">
              <div className="w-[85%] scale-90 flex justify-center origin-center transition-all duration-300 hover:translate-y-[-4px] hover:scale-95">
                {/* 這裡只傳入按鈕 logic */}
                <DailyQuote
                  userData={userData}
                  currentQuote={null} // 這裡不處理彈窗展示
                  onDraw={drawCard} 
                />
              </div>
            </div>
          )}
        </footer>

        {/* 仙佛慈語視窗 */}
        {currentQuote && (
          <DailyQuote 
            userData={userData}
            currentQuote={currentQuote} 
            onDraw={drawCard} 
            onOpenCollection={(quoteId) => {
              const isFav = userData.favorite?.includes(quoteId);
              const userRef = doc(db, 'users', user.uid);
              
              if (isFav) {
                updateDoc(userRef, { favorite: arrayRemove(quoteId) });
                setUserData(prev => ({
                  ...prev,
                  favorite: prev.favorite.filter(id => id !== quoteId)
                }));
              } else {
                updateDoc(userRef, { favorite: arrayUnion(quoteId) });
                setUserData(prev => ({
                  ...prev,
                  favorite: [...(prev.favorite || []), quoteId]
                }));
              }
            }}
            onCloseQuote={() => setCurrentQuote(null)} 
          />
        )}

        {/* 歷史慈語視窗*/}
        {showCollection && (
          <CollectionModal 
            favorite={userData.favorite || []}  // 傳入收藏標記
            collection={userData.collection || []}  // 傳入歷史紀錄
            allQuotes={allQuotes} 
            onClose={() => setShowCollection(false)} 
            setUserData={setUserData}
          />
        )}

        {/* 設定彈窗 */}
        {showSettings && (
          <SettingsModal 
            onClose={() => setShowSettings(false)} 
            onSignOut={() => signOut(auth)} 
          />
        )}

        {/* --- 彈窗組件：學修講辦 --- */}
        {activeCategory && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-[400px] rounded-[3rem] p-8 max-h-[85vh] overflow-y-auto border-4 border-black relative animate-in zoom-in duration-300">
              <button 
                onClick={() => setActiveCategory(null)} 
                className="absolute top-6 right-6 font-black text-xl p-2 cursor-pointer hover:opacity-50 transition-opacity"
              >
                ✕
              </button>
              <SkillTree 
                category={activeCategory} 
                userData={userData} 
                incrementSkill={incrementSkill} 
                decrementSkill={decrementSkill} 
              />
            </div>
          </div>
        )}
        {showFriendList && (
          <FriendList currentUser={userData} setUserData={setUserData} onVisit={(t) => { setViewingUser(t); setShowFriendList(false); }} onClose={() => setShowFriendList(false)} />
        )}
        {showEvents && <EventModal events={events} onClose={() => setShowEvents(false)} />}
        {showAchievementList && <AchievementList titleConfig={titleConfig} earnedBadges={userData.badges || []} onClose={() => setShowAchievementList(false)} />}
        {unlockedBadgeName && <BadgeUnlockModal badgeName={unlockedBadgeName} onClose={() => setUnlockedBadgeName(null)} />}
      </div>
    </div>
  );
}

export default App;