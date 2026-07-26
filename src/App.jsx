import React, { useState, useEffect, useRef, useMemo } from 'react';
import BadgeUnlockModal from './components/BadgeUnlockModal';
import { auth, db, provider } from './firebase-config';
import { signInWithPopup, signOut, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs } from 'firebase/firestore';
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
import ChallengeModal from './components/ChallengeModal';
import InAppBrowserNotice from './components/InAppBrowserNotice';
import { isMorningTime, getTitleConfig, getTodayKey, isTodayCheckIn } from './utils/gameLogic';
import { detectInAppBrowser, escapeToExternalBrowser } from './utils/browserEnv';
import { Logos } from './assets/AssetManager';
import { theme } from './styles/theme';

// 只在載入時判斷一次即可，User-Agent 不會中途改變
const inAppBrowser = detectInAppBrowser();

// 「智慧考驗來臨」功能目前先關閉；要重新開放時改成 true 即可
const ENABLE_CHALLENGE = false;

// 標記「已經送出 redirect 登入」，導回來時用來判斷登入是否真的成功
const REDIRECT_PENDING_KEY = 'seed:redirect-login-pending';

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
  const [allChallenges, setAllChallenges] = useState([]);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [ignoreInAppBrowser, setIgnoreInAppBrowser] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const titleConfig = useMemo(() => getTitleConfig(userData), [userData]);

  // 比對今天日期與資料庫紀錄的日期
  const hasWateredToday = useMemo(
    () => isTodayCheckIn(userData?.lastCheckIn),
    [userData?.lastCheckIn]
  );

  const openEventModal = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'events'));
      setEvents(querySnapshot.docs.map(d => d.data()));
      setShowEvents(true);
    } catch (err) {
      console.error('載入活動失敗:', err);
    }
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

  const handleChant = async () => {
    if (!userData || !user) return;

    const newCount = (userData?.stats?.誦經 || 0) + 1;

    // 早上 5~8 點誦經才會解鎖的隱藏成就
    const shouldUnlock = isMorningTime() && !userData?.badges?.includes("曙光覺醒者");

    // 先更新本地 state，讓畫面立即有回饋
    setUserData((prev) => ({
      ...prev,
      stats: { ...prev.stats, 誦經: newCount },
      badges: shouldUnlock ? [...(prev.badges || []), "曙光覺醒者"] : prev.badges,
    }));

    if (shouldUnlock) setUnlockedBadgeName("曙光覺醒者");

    // 誦經次數與成就一起寫回 Firestore（先前只寫了成就，次數重整就消失）
    const payload = { 'stats.誦經': newCount };
    if (shouldUnlock) payload.badges = arrayUnion("曙光覺醒者");

    try {
      await updateDoc(doc(db, 'users', user.uid), payload);
    } catch (err) {
      console.error('更新誦經紀錄失敗:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = null;

    const initializeAuth = async () => {
      // 上一輪有走 redirect 登入嗎？回來後要確認到底成功了沒
      const pendingRedirect = sessionStorage.getItem(REDIRECT_PENDING_KEY);
      sessionStorage.removeItem(REDIRECT_PENDING_KEY);

      let redirectSucceeded = false;
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          redirectSucceeded = true;
          if (isMounted) {
            setUser(result.user);
            await fetchUserData(result.user.uid);
          }
        }
      } catch (err) { console.error('登入跳轉結果讀取失敗:', err); }

      if (!isMounted) return;

      // GitHub Pages 的網域和 Firebase authDomain 不同源，部分瀏覽器的
      // 跨站儲存空間隔離會讓 redirect 登入靜默失敗，這裡至少要讓使用者知道
      if (pendingRedirect && !redirectSucceeded && !auth.currentUser) {
        setLoginError('登入沒有完成。請允許這個網站開啟彈出視窗後再試一次，或改用 Chrome / Safari 開啟。');
      }

      unsubscribe = auth.onAuthStateChanged(async (u) => {
        if (!isMounted) return;
        try {
          if (u) {
            setUser(u);
            await fetchUserData(u.uid);
          } else {
            setUser(null);
            setUserData(null);
          }
        } catch (err) {
          // 讀不到使用者資料也要放行，否則會永遠卡在載入畫面
          console.error('讀取使用者資料失敗:', err);
        } finally {
          if (isMounted) setLoading(false);
        }
      });

    };

    initializeAuth();

    return () => {
      isMounted = false;
      // 先前這裡沒有解除監聽，熱重載 / 重新掛載時會殘留 listener
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 慈語與考驗題目需要登入後才讀得到，未登入時先不要送出必定失敗的請求
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const loadContent = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'daily_quotes'));
        if (isMounted) setAllQuotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error('載入慈語失敗:', err); }

      if (!ENABLE_CHALLENGE) return;
      try {
        const snapshot = await getDocs(collection(db, 'challenges'));
        if (isMounted) setAllChallenges(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error('載入考驗題目失敗:', err); }
    };

    loadContent();
    return () => { isMounted = false; };
  }, [user]);

  useEffect(() => {
    if (!userData || !userData.stats || !user) return;
    const currentBadgeNames = titleConfig
      .filter((t) => t.name !== "曙光覺醒者")
      .filter((t) => t.requirement())
      .map((t) => t.name);
    // 第一次載入：條件已達標但資料庫沒紀錄的成就要補寫回去，只是不播解鎖動畫
    const isFirstRun = !hasInitializedBadges.current;
    const missingBadges = currentBadgeNames.filter(
      (name) => !userData.badges?.includes(name)
    );

    if (isFirstRun) {
      hasInitializedBadges.current = true;
      prevBadgeNamesRef.current = currentBadgeNames;
      if (missingBadges.length > 0) {
        updateDoc(doc(db, 'users', user.uid), { badges: arrayUnion(...missingBadges) })
          .catch(err => console.error('補寫成就失敗:', err));
        setUserData(prev => ({ ...prev, badges: [...(prev.badges || []), ...missingBadges] }));
      }
      return;
    }

    // 本次操作才剛達標的成就，播動畫並寫回
    const newBadges = missingBadges.filter((name) => !prevBadgeNamesRef.current.includes(name));

    if (newBadges.length > 0) {
      setUnlockedBadgeName(newBadges[0]);
      updateDoc(doc(db, 'users', user.uid), { badges: arrayUnion(...newBadges) })
        .catch(err => console.error('儲存成就失敗:', err));
      setUserData(prev => ({ ...prev, badges: [...(prev.badges || []), ...newBadges] }));
    }
    prevBadgeNamesRef.current = currentBadgeNames;
  }, [userData, titleConfig, user]);

  const handleLogin = async () => {
    // App 內建瀏覽器（LINE / FB / IG）會被 Google 擋下，直接引導去外部瀏覽器
    if (inAppBrowser) {
      escapeToExternalBrowser(inAppBrowser.id);
      setIgnoreInAppBrowser(false);
      return;
    }

    setLoginError(null);

    try {
      // 1. 不管手機還是電腦，一律優先用 Popup —— 這是在 GitHub Pages 上唯一穩定的方式
      await signInWithPopup(auth, provider);
    } catch (error) {
      // 使用者自己關掉視窗或連點兩次，不算錯誤，不要吵他
      if (error.code === 'auth/popup-closed-by-user' ||
          error.code === 'auth/cancelled-popup-request') return;

      // 2. Popup 被瀏覽器擋掉時，退而求其次改用 Redirect。
      //    注意：本站的網域與 Firebase authDomain 不同源，部分瀏覽器會因為
      //    跨站儲存空間隔離而讓 Redirect 失敗，所以先留下標記以便回來時檢查。
      if (error.code === 'auth/popup-blocked') {
        console.warn('Popup 被攔截，改用 Redirect 登入');
        sessionStorage.setItem(REDIRECT_PENDING_KEY, '1');
        signInWithRedirect(auth, provider).catch((redirectError) => {
          sessionStorage.removeItem(REDIRECT_PENDING_KEY);
          console.error('Redirect 登入失敗:', redirectError);
          setLoginError('登入失敗，請在瀏覽器設定中允許本站開啟彈出視窗後再試一次。');
        });
        return;
      }

      console.error('Login Error:', error);
      setLoginError('登入失敗，請稍後再試（' + (error.code || error.message) + '）');
    }
  };

  const drawCard = async () => {
    if (!userData || !user) return;

    let newQuotes = allQuotes;
    if (newQuotes.length === 0) {
      try {
        const snapshot = await getDocs(collection(db, 'daily_quotes'));
        newQuotes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllQuotes(newQuotes);
      } catch (err) {
        console.error('載入慈語失敗:', err);
        return;
      }
    }
    if (newQuotes.length === 0) return;

    const filtered = newQuotes.filter(item => userData.isTaoQin ? true : item.type === 'non_Taoqin');
    if (filtered.length === 0) return;

    const randomQuote = filtered[Math.floor(Math.random() * filtered.length)];
    setCurrentQuote(randomQuote);

    // 一天只加一次經驗值，但慈語可以無限抽
    const today = getTodayKey();
    const alreadyWatered = isTodayCheckIn(userData.lastCheckIn);
    const newExp = alreadyWatered ? (userData.exp || 0) : (userData.exp || 0) + 1;

    setUserData(prev => ({
      ...prev,
      collection: Array.from(new Set([...(prev.collection || []), randomQuote.id])),
      exp: newExp,
      lastCheckIn: today
    }));

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        collection: arrayUnion(randomQuote.id),
        exp: newExp,
        lastCheckIn: today
      });
    } catch (err) {
      console.error('更新簽到紀錄失敗:', err);
    }
  };

  const updateSkillCount = (skill, newCount) => {
    setUserData(prev => ({ ...prev, stats: { ...prev.stats, [skill]: newCount } }));
    updateDoc(doc(db, 'users', user.uid), { [`stats.${skill}`]: newCount })
      .catch(err => console.error(`更新 ${skill} 失敗:`, err));
  };

  const incrementSkill = (skill) => {
    if (!userData || !user) return;
    updateSkillCount(skill, (userData.stats?.[skill] || 0) + 1);
  };

  const decrementSkill = (skill) => {
    if (!userData || !user) return;
    const current = userData.stats?.[skill] || 0;
    if (current <= 0) return;
    updateSkillCount(skill, current - 1);
  };

  const drawChallenge = async () => {
    let newChallenges = allChallenges;
    if (newChallenges.length === 0) {
      try {
        const snapshot = await getDocs(collection(db, 'challenges'));
        newChallenges = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllChallenges(newChallenges);
      } catch (err) {
        console.error('載入考驗題目失敗:', err);
        return;
      }
    }

    if (newChallenges.length === 0) return;

    const randomChallenge = newChallenges[Math.floor(Math.random() * newChallenges.length)];
    setCurrentChallenge(randomChallenge); // 塞入獨立狀態
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="w-12 h-12 border-4 border-[#bad32d] border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 font-black text-[#bad32d]">種子萌芽中...</p>
    </div>
  );

  // LINE / FB / IG 的內建瀏覽器無法完成 Google 登入，先引導使用者換到外部瀏覽器
  if (!user && inAppBrowser && !ignoreInAppBrowser) return (
    <InAppBrowserNotice
      browser={inAppBrowser}
      onContinueAnyway={() => setIgnoreInAppBrowser(true)}
    />
  );

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="flex items-center gap-4 mb-4">
        <img src={Logos.Main} alt="Logo" className="h-20 object-contain" />
        <img src={Logos.Small} alt="Small Logo" className="h-12 object-contain" />
      </div>
      <h1 className="text-4xl font-black mb-8 text-black" style={{ color: '#000000' }}>🌱 崇德心靈種子</h1>
      <button onClick={handleLogin} className="bg-black text-white px-12 py-4 rounded-full font-bold cursor-pointer">開啟探索</button>
      {loginError && (
        <p className="mt-6 max-w-[320px] text-center text-sm font-bold text-red-600 leading-relaxed px-6">
          {loginError}
        </p>
      )}
    </div>
  );

  // 已登入但使用者資料抓不到（例如連線失敗），底下的畫面會直接讀取 userData 而爆掉
  if (!userData) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-8 text-center">
      <p className="font-black text-lg mb-2" style={{ color: theme.dark }}>資料載入失敗 😢</p>
      <p className="font-bold text-sm text-gray-500 mb-6">請確認網路連線後再試一次</p>
      <button
        onClick={() => window.location.reload()}
        className="bg-black text-white px-10 py-3 rounded-full font-black cursor-pointer"
      >
        重新載入
      </button>
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
              <>
                <button 
                  onClick={() => setShowSettings(true)}
                  className="group flex flex-col items-start"
                  >
                  <h2 className="w-[10ch] text-xl font-black truncate cursor-pointer bg-white/80 px-2 rounded-lg border-2 border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center" style={{ color: theme.dark }}>
                    <span className="truncate">{userData?.name || "用戶"}</span>
                    <span>⚙️</span>
                  </h2>
                </button>

                {ENABLE_CHALLENGE && (
                  <button
                    onClick={drawChallenge}
                    className="mt-1 cursor-pointer bg-[#ff5252] border-2 border-black px-3 py-1.5 rounded-xl font-black text-xs text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1 group"
                    >
                    <span className="text-sm group-hover:animate-bounce">⚡</span>
                    <span>智慧考驗來臨</span>
                  </button>
                )}
              </>
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
                updateDoc(userRef, { favorite: arrayRemove(quoteId) })
                  .catch(err => console.error('取消收藏失敗:', err));
                setUserData(prev => ({
                  ...prev,
                  favorite: (prev.favorite || []).filter(id => id !== quoteId)
                }));
              } else {
                updateDoc(userRef, { favorite: arrayUnion(quoteId) })
                  .catch(err => console.error('加入收藏失敗:', err));
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
            userData={userData} // 傳入用戶資料
            setUserData={setUserData} // 傳入更新狀態的方法
            onClose={() => setShowSettings(false)} 
            onSignOut={() => signOut(auth)} 
          />
        )}

        {/* --- 彈窗組件：學修講辦 --- */}
        {activeCategory && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-[400px] rounded-[3rem] p-8 max-h-[85vh] overflow-y-auto border-4 border-black relative animate-in zoom-in duration-300">
              <SkillTree 
                category={activeCategory} 
                userData={userData} 
                incrementSkill={incrementSkill} 
                decrementSkill={decrementSkill}
                handleChant={handleChant}
              />
              <button 
                onClick={() => setActiveCategory(null)} 
                className="absolute top-6 right-6 font-black text-xl p-2 cursor-pointer hover:opacity-50 transition-opacity"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {showFriendList && (
          <FriendList
            currentUser={userData}
            setUserData={setUserData}
            onVisit={(t) => { setViewingUser(t); setShowFriendList(false); }}
            onClose={() => setShowFriendList(false)}
          />
        )}
        {showEvents && (
          <EventModal
            events={events}
            onClose={() => setShowEvents(false)}
          />
        )}
        {showAchievementList && (
          <AchievementList
            titleConfig={titleConfig}
            earnedBadges={userData.badges || []}
            onClose={() => setShowAchievementList(false)}
          />
        )}
        {unlockedBadgeName && (
          <BadgeUnlockModal
            badgeName={unlockedBadgeName}
            onClose={() => setUnlockedBadgeName(null)}
          />
        )}
        {currentChallenge && (
          <ChallengeModal 
            challenge={currentChallenge}
            onDraw={drawChallenge}
            onClose={() => setCurrentChallenge(null)}
          />
        )}
      </div>
    </div>
  );
}

export default App;