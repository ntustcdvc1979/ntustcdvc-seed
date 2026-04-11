import React, { useState, useEffect } from 'react';
import { auth, db, provider } from './firebase-config';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, getDocs } from 'firebase/firestore';

import DailyQuote from './components/DailyQuote'
import EventModal from './components/EventModal';
import Badge from './components/Badge';
import SkillTree from './components/SkillTree';
import { getTitleConfig } from './utils/gameLogic';
import { Logos } from './assets/AssetManager';
import { theme } from './styles/theme';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [showEvents, setShowEvents] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(null);
  const [events, setEvents] = useState([]);

  // 取得稱號配置
  const titleConfig = getTitleConfig(userData);

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
      覺察情緒: 0, 每日反省: 0, 一千叩首: 0, 每日用三寶: 0, 轉念: 0, 佈施: 0, 忍辱: 0,
      推薦朋友: 0, 分享好文: 0, 關心成全一個人: 0, 分享道在日常: 0,
      開伙幫廚: 0, 整理環境: 0, 蔬食一餐: 0, 壇務工作: 0, 淨灘山志工: 0, 參與營隊志工: 0, 參與獻供: 0, 法會實務: 0, 渡一個人: 0
    };

    if (docSnap.exists()) {
      const dbData = docSnap.data();

      const mergedUserData = {
        ...dbData,
        stats: {
          ...defaultStats,
          ...(dbData.stats || {}) // 確保 stats 即使為空也不會報錯
        }
      };

      setUserData(mergedUserData);
    } else {
      const initial = {
        isTaoQin: false,
        stats: defaultStats,
        collection: [],
        lastCheckIn: ""
      };
      await setDoc(userRef, initial);
      setUserData(initial);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u) { setUser(u); fetchUserData(u.uid); }
      else { setUser(null); setUserData(null); }
    });
    return () => unsubscribe();
  }, []);

  const drawCard = async () => {
    const snapshot = await getDocs(collection(db, 'daily_quotes'));
    const quotes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const filtered = quotes.filter(item => userData.isTaoQin ? true : item.type === 'non_Taoqin');
    const randomQuote = filtered[Math.floor(Math.random() * filtered.length)];
    setCurrentQuote(randomQuote);

    const userRef = doc(db, 'users', user.uid);
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

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="flex items-center gap-4 mb-4">
        <img src={Logos.Main} alt="Logo" className="h-20 object-contain" />
        <img src={Logos.Small} alt="Small Logo" className="h-12 object-contain" />
      </div>
      <h1 className="text-4xl font-black mb-8 text-black" style={{ color: '#000000' }}>🌱 崇德心靈種子</h1>
      <button onClick={() => signInWithPopup(auth, provider)} className="bg-black text-white px-12 py-4 rounded-full font-bold">開啟探索</button>
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
                .filter((t) => t.requirement())
                .map((t) => (
                  <Badge key={t.name} badgeData={t} /> // 將整個物件 t 傳入
                ))}
            </div>
          </div>
          {userData?.isTaoQin && <div className="text-5xl">🌱</div>}
        </header>

        {/* 慈語抽卡 */}
        <DailyQuote currentQuote={currentQuote} onDraw={drawCard} />

        {/* 技能樹 */}
        <SkillTree 
          userData={userData} 
          incrementSkill={incrementSkill} 
        />

        {/* 活動快訊按鈕 */}
        <button 
          onClick={openEventModal} 
          style={{ backgroundColor: theme.green, boxShadow: `0 8px 0px 0px #a5bc28` }}
          className="w-full mt-12 text-white py-6 rounded-[2.5rem] font-black text-2xl active:translate-y-1 active:shadow-none transition-all"
        >
          📅 活動快訊
        </button>

        {/* 登出按鈕 */}
        <button onClick={() => signOut(auth)} className="w-full mt-8 text-gray-400 text-xs font-bold underline">登出</button>
      </div>

      {showEvents && <EventModal events={events} onClose={() => setShowEvents(false)} />}
    </div>
  );
}

export default App;