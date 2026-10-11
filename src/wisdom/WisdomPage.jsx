import React, { useEffect, useRef, useState } from 'react';
import { theme } from '../styles/theme';
import { Logos } from '../assets/AssetManager';
import { renderContent } from '../components/utils';
import { fetchQuotes } from '../services/quotes';
import BackgroundImg from '../assets/background.webp';

/**
 * 智慧語錄：不需登入就能抽仙佛慈語。
 * 後端對未登入的請求只回傳一般慈語，等同非道親（isTaoQin = false）。
 */
export default function WisdomPage() {
  const [quotes, setQuotes] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [current, setCurrent] = useState(null);
  const [drawCount, setDrawCount] = useState(0);
  const lastIdRef = useRef(null);

  // 每次 attempt 變動就重新載入（按「重新載入」時加 1）
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetchQuotes()
      .then((list) => {
        if (!isMounted) return;
        setQuotes(list);
        setStatus(list.length ? 'ready' : 'error');
      })
      .catch((err) => {
        console.error('載入慈語失敗:', err);
        if (isMounted) setStatus('error');
      });
    return () => { isMounted = false; };
  }, [attempt]);

  const retry = () => {
    setStatus('loading');
    setAttempt((n) => n + 1);
  };

  const draw = () => {
    if (quotes.length === 0) return;
    // 避免連續抽到同一則
    const pool = quotes.length > 1 ? quotes.filter((q) => q.id !== lastIdRef.current) : quotes;
    const next = pool[Math.floor(Math.random() * pool.length)];
    lastIdRef.current = next.id;
    setCurrent(next);
    // 換一個 key 讓卡片每次都重新播放出場動畫
    setDrawCount((n) => n + 1);
  };

  return (
    <div
      className="min-h-svh w-full flex justify-center items-center px-4 py-8 bg-repeat"
      style={{ backgroundImage: `url(${BackgroundImg})`, backgroundSize: '400px' }}
    >
      <main className="w-full max-w-[420px] bg-white/95 border-4 border-black rounded-[2.5rem] px-6 py-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center">
        <img src={Logos.Main} alt="崇德心靈種子" className="h-14 object-contain mb-3" />
        <h1 className="text-3xl font-black tracking-widest" style={{ color: theme.dark }}>智慧語錄</h1>
        <p className="text-sm font-bold text-gray-500 mt-2">抽一則仙佛慈語，給此刻的自己</p>

        <div className="w-full min-h-[220px] flex items-center justify-center my-7">
          {current ? (
            <figure
              key={drawCount}
              className="w-full p-6 rounded-[2rem] border-4 bg-[#fffdf5] animate-in zoom-in-95 fade-in duration-300"
              style={{ borderColor: theme.yellow }}
            >
              <blockquote className="text-xl font-black leading-relaxed" style={{ color: theme.dark }}>
                「{renderContent(current.content)}」
              </blockquote>
              <figcaption className="text-base font-black text-right mt-4" style={{ color: theme.green }}>
                — {current.author}
              </figcaption>
            </figure>
          ) : status === 'error' ? (
            <div className="space-y-3">
              <p className="font-bold text-gray-500">慈語暫時載入失敗了</p>
              <button onClick={retry} className="cursor-pointer font-black underline" style={{ color: theme.dark }}>
                重新載入
              </button>
            </div>
          ) : (
            <p className="text-6xl select-none" aria-hidden="true">🌱</p>
          )}
        </div>

        <button
          onClick={draw}
          disabled={status !== 'ready'}
          className="w-full cursor-pointer rounded-[2rem] text-white font-black text-xl py-4 border-4 border-black active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-wait"
          style={{ backgroundColor: theme.yellow, boxShadow: '0 6px 0px 0px #d4a017' }}
        >
          {status === 'loading' ? '慈語準備中...' : current ? '🔄 再抽一則' : '✨ 抽一則仙佛慈語 ✨'}
        </button>

        <p className="text-xs font-bold text-gray-400 mt-8">台科大崇德志工社</p>
      </main>
    </div>
  );
}
