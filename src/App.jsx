import React, { useState, useEffect, useRef, useMemo } from 'react';
import BadgeUnlockModal from './components/BadgeUnlockModal'; // 動畫
import { auth, db, provider } from './firebase-config';
import { signInWithPopup, signOut, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, getDocs } from 'firebase/firestore';
import { FaInstagram, FaFacebook, FaLine } from 'react-icons/fa'; // 圖示

import DailyQuote from './components/DailyQuote'
import EventModal from './components/EventModal';
import Badge from './components/Badge';
import SkillTree from './components/SkillTree';
import CollectionModal from './components/CollectionModal'
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
  const [unlockedBadgeName, setUnlockedBadgeName] = useState(null); // 控制動畫顯示的勳章名稱
  const hasInitializedBadges = useRef(false); // 標記是否已完成初次加載
  const prevBadgeNamesRef = useRef([]); // 紀錄上一次滿足條件的勳章清單

  // 取得稱號配置
  const titleConfig = useMemo(() => getTitleConfig(userData), [userData]);

  const openEventModal = async () => {
    const querySnapshot = await getDocs(collection(db, 'events'));
    setEvents(querySnapshot.docs.map(doc => doc.data()));
    setShowEvents(true);
  };

  const fetchUserData = async (uid) => {
    const userRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userRef);

    const defaultStats = { 
      頌經: 0, 抄寫經典: 0, 參與研究班: 0, 研讀聖訓經典: 0,
      覺察情緒: 0, 每日反省: 0, 一千叩首: 0, 每日用三寶: 0, 整理環境: 0, 轉念: 0, 佈施: 0, 忍辱: 0,
      推薦朋友: 0, 分享好文: 0, 關心成全一個人: 0, 分享道在日常: 0,
      開伙幫廚: 0, 蔬食一餐: 0, 壇務工作: 0, 淨灘山志工: 0, 參與營隊志工: 0, 參與獻供: 0, 法會實務: 0, 渡一個人: 0
    };

    if (docSnap.exists()) {
      const dbData = docSnap.data();

      const mergedUserData = {
        ...dbData,
        stats: {
          ...defaultStats,
          ...(dbData.stats || {}) // 確保 stats 即使為空也不會報錯
        },
        badges: dbData.badges || [], 
        collection: dbData.collection || []
      };

      setUserData(mergedUserData);
    } else {
      const initial = {
        isTaoQin: false,
        stats: defaultStats,
        collection: [],
        badges: [],
        lastCheckIn: ""
      };
      await setDoc(userRef, initial);
      setUserData(initial);
    }
  };

  useEffect(() => {
    // A. 處理 Redirect 登入結果
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          fetchUserData(result.user.uid);
        }
      })
      .catch((err) => console.error("Redirect Error:", err));

    // B. 監聽登入狀態切換
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u) {
        setUser(u);
        fetchUserData(u.uid);
      } else {
        setUser(null);
        setUserData(null);
      }
    });

    // C. 抓取所有慈語 (只需執行一次)
    const fetchQuotes = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'daily_quotes'));
        setAllQuotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Fetch Quotes Error:", err);
      }
    };
    
    fetchQuotes();

    return () => unsubscribe();
  }, []);

  // 監控勳章解鎖邏輯
  useEffect(() => {
    // 1. 基礎檢查：確保資料、stats 與 user 都已載入
    if (!userData || !userData.stats || !user) return;

    // 2. 取得目前所有滿足條件的勳章名稱
    const currentBadgeNames = titleConfig
      .filter((t) => t.requirement())
      .map((t) => t.name);

    // 3. 初次加載時，只紀錄目前狀態，不跳動畫 (避免登入時刷出一堆舊勳章)
    if (!hasInitializedBadges.current) {
      prevBadgeNamesRef.current = currentBadgeNames;
      hasInitializedBadges.current = true;
      return;
    }

    // 4. 【核心防範】找出「新解鎖」且「以前從未獲得過」的勳章
    // 我們要比對 currentBadgeNames (現在符合) 
    // 且排除 userData.badges (資料庫中已有的紀錄)
    const newBadges = currentBadgeNames.filter((name) => {
      const hasAlreadyEarned = userData.badges && userData.badges.includes(name);
      const wasInPrevRef = prevBadgeNamesRef.current.includes(name);
      
      // 只有「現在符合條件」且「資料庫裡沒有」且「剛才那秒還沒達成」的才算新解鎖
      return !hasAlreadyEarned && !wasInPrevRef;
    });

    // 5. 如果有新解鎖，觸發動畫並永久存入資料庫
    if (newBadges.length > 0) {
      const badgeToAnimate = newBadges[0];
      setUnlockedBadgeName(badgeToAnimate);

      // 更新 Firebase：永久紀錄此勳章已獲得
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, { 
        badges: arrayUnion(...newBadges) 
      });

      // 同步更新本地 state，確保下一秒 logic 知道已拿過
      setUserData(prev => ({
        ...prev,
        badges: [...(prev.badges || []), ...newBadges]
      }));
    }

    // 6. 更新紀錄，為下一次比對做準備
    prevBadgeNamesRef.current = currentBadgeNames;

  }, [userData, titleConfig, user]);

  const handleLogin = () => {
    // 簡單判斷：如果是手機或平板，使用 Redirect
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      signInWithRedirect(auth, provider);
    } else {
      signInWithPopup(auth, provider).catch((error) => {
        // 如果 Popup 失敗（被阻擋），降級使用 Redirect
        if (error.code === 'auth/popup-blocked') {
          signInWithRedirect(auth, provider);
        }
      });
    }
  };

  const drawCard = async () => {
    if (allQuotes.length === 0) return;
    const filtered = allQuotes.filter(item => userData.isTaoQin ? true : item.type === 'non_Taoqin');
    const randomQuote = filtered[Math.floor(Math.random() * filtered.length)];
    setCurrentQuote(randomQuote);

    const userRef = doc(db, 'users', user.uid);
    // 更新本地與 Firebase
    const newCollection = Array.from(new Set([...userData.collection, randomQuote.id]));
    setUserData({ ...userData, collection: newCollection });
    
    await updateDoc(userRef, { 
      collection: arrayUnion(randomQuote.id), 
      lastCheckIn: new Date().toLocaleDateString() 
    });
  };

  const incrementSkill = (skill) => {
    if (!userData) return;

    const userRef = doc(db, 'users', user.uid);
    
    // 取得當前數值 (若無則為 0)
    const currentCount = (userData.stats && userData.stats[skill]) ? userData.stats[skill] : 0;
    const newCount = currentCount + 1;

    // 1. 更新本地 State 以即時反應 UI
    const newStats = { ...userData.stats, [skill]: newCount };
    setUserData({ ...userData, stats: newStats });

    // 2. 更新 Firestore (使用點記法更新特定欄位，不會蓋掉其他技能)
    updateDoc(userRef, { 
      [`stats.${skill}`]: newCount 
    });
  };

  const decrementSkill = (skill) => {
    if (!userData) return;

    const currentCount = (userData.stats && userData.stats[skill]) ? userData.stats[skill] : 0;
    if (currentCount <= 0) return; // 防止變負數

    const newCount = currentCount - 1;
    const userRef = doc(db, 'users', user.uid);

    // 更新本地與資料庫
    setUserData({ ...userData, stats: { ...userData.stats, [skill]: newCount } });
    updateDoc(userRef, { [`stats.${skill}`]: newCount });
  };

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
    <div className="min-h-screen bg-[#fffdf5] flex justify-center md:py-10">
      <div className="bg-white w-full max-w-md min-h-screen md:min-h-0 md:rounded-[3rem] shadow-[0_20px_50px_rgba(186,211,45,0.15)] p-8 overflow-y-auto border-4 border-[#bad32d]/20" style={{ color: theme.dark }}>

        {/* Logo */}
        <div className="flex justify-center items-center gap-3 mb-6 bg-[#bad32d]/10 py-4 rounded-3xl">
          <img src={Logos.Main} alt="Main Logo" className="h-12 object-contain" />
          <h1 className="text-2xl font-black" style={{ color: theme.dark }}>心靈種子</h1>
        </div>

        {/* Header */}
        <header className="flex justify-between items-start mb-10 border-b-2 border-dashed border-[#bad32d] pb-8">
          <div className="flex-1">
            <p 
              className="text-2xl font-medium opacity-60 mb-2 tracking-wider" 
              style={{ color: theme.dark }}
            >
              你好，{user.displayName}
            </p>
            
            {/* 勳章 */}
            <div className="flex flex-wrap gap-5 mt-2">
              {titleConfig
                .filter((t) => userData?.badges?.includes(t.name)) // 核心修改：改為判斷是否在收藏清單中
                .map((t) => (
                  <Badge key={t.name} badgeData={t} />
                ))}
            </div>
          </div>
          {userData?.isTaoQin && <div className="text-5xl">🌱</div>}
        </header>

        {/* 慈語抽卡 */}
        <DailyQuote
          currentQuote={currentQuote}
          onDraw={drawCard} 
          onOpenCollection={() => setShowCollection(true)}
        />

        {/* 收藏視窗 */}
        {showCollection && (
          <CollectionModal 
            collection={userData.collection} 
            allQuotes={allQuotes} 
            onClose={() => setShowCollection(false)} 
          />
        )}

        {/* 技能樹 */}
        <SkillTree 
          userData={userData} 
          incrementSkill={incrementSkill}
          decrementSkill={decrementSkill}
        />

        {/* 活動快訊按鈕 */}
        <button 
          onClick={openEventModal} 
          style={{ backgroundColor: theme.green, boxShadow: `0 8px 0px 0px #a5bc28` }}
          className="w-full mt-12 text-white py-6 rounded-[2.5rem] font-black text-2xl active:translate-y-1 active:shadow-none transition-all"
        >
          📅 活動快訊
        </button>

        {/* 底部社群連結 */}
        <div className="mt-12 pt-8 border-t-2 border-dashed border-[#bad32d]/30 flex flex-col items-center">
          <p className="text-xs font-black opacity-40 mb-4 tracking-widest" style={{ color: theme.dark }}>
            CONNECT WITH US
          </p>
          
          <div className="flex gap-6">
            {/* Instagram */}
            <a 
              href="https://www.instagram.com/ntustcdvc?igsh=M2pmNTJiMGpvbnRl" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-white border-4 border-[#1a1a1a] flex items-center justify-center text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all"
              style={{ boxShadow: `4px 4px 0px 0px ${theme.yellow}` }}
            >
              <FaInstagram style={{ color: '#E1306C' }} />
            </a>

            {/* Facebook */}
            <a 
              href="https://www.facebook.com/cdvcntust/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-white border-4 border-[#1a1a1a] flex items-center justify-center text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all"
              style={{ boxShadow: `4px 4px 0px 0px ${theme.yellow}` }}
            >
              <FaFacebook style={{ color: '#1877F2' }} />
            </a>

            {/* LINE 匿名社群 */}
            <a 
              href="https://line.me/ti/g2/zovx0m_zdGqe-VDGrtJxYPafrxfIt5JM9Z3n2g?utm_source=invitation&utm_medium=link_copy&utm_campaign=default" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-white border-4 border-[#1a1a1a] flex items-center justify-center text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all"
              style={{ boxShadow: `4px 4px 0px 0px ${theme.yellow}` }}
            >
              <FaLine style={{ color: '#06C755' }} />
            </a>
          </div>
          
          <p className="mt-6 text-[10px] font-bold opacity-30">
            © 2026 崇德心靈種子 | 智慧修道系統
          </p>
        </div>

        {/* 登出按鈕 */}
        <button onClick={() => signOut(auth)} className="w-full mt-8 text-gray-400 text-xs font-bold underline">登出</button>
      </div>

      {showEvents && <EventModal events={events} onClose={() => setShowEvents(false)} />}

      {/* 解鎖動畫視窗 (放在最下層確保能蓋過所有內容) */}
      {unlockedBadgeName && (
        <BadgeUnlockModal 
          badgeName={unlockedBadgeName} 
          onClose={() => setUnlockedBadgeName(null)} // 點擊後關閉動畫
        />
      )}
    </div>
  );
}

export default App;