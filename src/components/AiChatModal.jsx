import React, { useEffect, useRef, useState } from 'react';
import { theme } from '../styles/theme';
import { renderContent } from './utils';
import { askQuotes, clearAiHistory, describeAiError, getAiHistory } from '../services/aiAssistant';

const SUGGESTIONS = [
  '最近壓力好大，該怎麼調適？',
  '跟家人一直吵架怎麼辦？',
  '做事總是提不起勁',
  '怎麼面對別人的誤會？',
];

const MAX_LENGTH = 300;

const formatDate = (ms) =>
  new Date(ms).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

/** 歷史紀錄的一筆問答 → 畫面上的兩則訊息 */
const entryToMessages = (entry) => [
  { role: 'user', text: entry.question, createdAt: entry.createdAt },
  { role: 'assistant', reply: entry.reply, quotes: entry.quotes, createdAt: entry.createdAt },
];

/**
 * @param {string[]} favorites 已收藏的慈語 id
 * @param {(quoteId: string) => void} onToggleFavorite
 */
export default function AiChatModal({ onClose, favorites, onToggleFavorite }) {
  const [messages, setMessages] = useState([]);
  const [historyStatus, setHistoryStatus] = useState('loading'); // loading | ready | error
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef(null);
  const hasScrolledInitially = useRef(false);

  useEffect(() => {
    let isMounted = true;
    getAiHistory()
      .then((entries) => {
        if (!isMounted) return;
        setMessages(entries.flatMap(entryToMessages));
        setHistoryStatus('ready');
      })
      .catch((err) => {
        console.error('讀取萌芽解憂所紀錄失敗:', err);
        if (isMounted) setHistoryStatus('error');
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (historyStatus === 'loading') return;
    // 第一次載入歷史直接跳到最底，之後的新訊息才用平滑捲動
    bottomRef.current?.scrollIntoView({ behavior: hasScrolledInitially.current ? 'smooth' : 'auto', block: 'end' });
    hasScrolledInitially.current = true;
  }, [messages, loading, historyStatus]);

  const send = async (text) => {
    const question = text.trim();
    if (!question || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: question, createdAt: Date.now() }]);
    setLoading(true);
    try {
      const { reply, quotes, createdAt } = await askQuotes(question);
      setMessages((prev) => [...prev, { role: 'assistant', reply, quotes: quotes || [], createdAt }]);
    } catch (err) {
      console.error('萌芽解憂所失敗:', err);
      setMessages((prev) => [...prev, { role: 'error', text: describeAiError(err), createdAt: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('確定要清除所有萌芽解憂所的紀錄嗎？清除後無法復原。')) return;
    setClearing(true);
    try {
      await clearAiHistory();
      setMessages([]);
    } catch (err) {
      console.error('清除紀錄失敗:', err);
      window.alert('清除失敗，請稍後再試');
    } finally {
      setClearing(false);
    }
  };

  const handleKeyDown = (e) => {
    // Enter 送出，Shift+Enter 換行；注音選字時的 Enter 不要誤送
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-[450px] mx-auto h-[85dvh] rounded-t-[2.5rem] border-t-8 border-black flex flex-col animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題 */}
        <div className="flex justify-between items-start gap-2 px-6 pt-6 pb-3 border-b-2 border-gray-100">
          <div className="min-w-0">
            <h3 className="text-xl font-black" style={{ color: theme.dark }}>🌱 萌芽解憂所</h3>
            <p className="text-xs font-bold text-gray-400 mt-0.5">給自己一個靜心的空檔，聽聽內心的聲音，讓仙佛的智慧為你解開迷惘</p>
          </div>
          <div className="flex items-center shrink-0">
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                disabled={clearing || loading}
                className="text-xs font-black text-gray-400 px-2 py-1 cursor-pointer hover:text-red-500 transition-colors disabled:opacity-40"
              >
                {clearing ? '清除中...' : '清除紀錄'}
              </button>
            )}
            <button onClick={onClose} className="font-black text-2xl p-2 cursor-pointer hover:opacity-50 transition-opacity">✕</button>
          </div>
        </div>

        {/* 對話內容 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
          {historyStatus === 'loading' && (
            <p className="text-center pt-8 text-sm font-black text-gray-400 animate-pulse">載入紀錄中...</p>
          )}

          {historyStatus === 'error' && (
            <p className="text-center text-xs font-bold text-gray-400">過去的紀錄暫時載入失敗，仍然可以繼續提問</p>
          )}

          {historyStatus !== 'loading' && messages.length === 0 && (
            <div className="pt-4">
              <p className="text-sm font-black text-gray-400 mb-3 text-center">選擇符合此刻的心情，或自行輸入你想傾訴的話：</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="cursor-pointer text-sm font-bold px-3 py-2 rounded-2xl border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
                    style={{ color: theme.dark }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <React.Fragment key={i}>
              {msg.role === 'user' && (i === 0 || !isSameDay(messages[i - 1].createdAt, msg.createdAt)) && (
                <p className="text-center text-[11px] font-black text-gray-300 tracking-widest pt-2">
                  {formatDate(msg.createdAt)}
                </p>
              )}
              <Message msg={msg} favorites={favorites} onToggleFavorite={onToggleFavorite} />
            </React.Fragment>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-sm font-black text-gray-400 animate-pulse">
              <span>📖</span> 翻閱慈語中...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 輸入區 */}
        <div className="px-5 pt-3 pb-5 border-t-2 border-gray-100">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_LENGTH))}
              onKeyDown={handleKeyDown}
              placeholder="寫下此刻的心事，讓上天聽聽你的聲音..."
              rows={2}
              disabled={loading}
              className="flex-1 resize-none max-h-28 border-2 border-black rounded-2xl px-4 py-2.5 font-bold text-base focus:outline-none bg-gray-50 disabled:opacity-60"
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{ backgroundColor: theme.green }}
              className="shrink-0 cursor-pointer text-white font-black px-4 py-2.5 rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              送出
            </button>
          </div>
          <p className="text-[11px] font-bold text-gray-400 mt-2 text-center leading-relaxed">
            請勿輸入個人隱私資料。
          </p>
        </div>
      </div>
    </div>
  );
}

function Message({ msg, favorites, onToggleFavorite }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] bg-black text-white font-bold text-sm px-4 py-2.5 rounded-2xl rounded-br-md whitespace-pre-wrap break-words">
          {msg.text}
        </p>
      </div>
    );
  }

  if (msg.role === 'error') {
    return (
      <p className="text-sm font-bold text-red-600 bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-2.5">
        {msg.text}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {msg.reply && (
        <p className="text-sm font-bold text-gray-600 leading-relaxed">{msg.reply}</p>
      )}
      {msg.quotes.map((q) => {
        const isFavorite = favorites?.includes(q.id);
        return (
          <div
            key={q.id}
            className="relative p-4 pt-5 pr-12 rounded-2xl border-2 bg-[#fffdf5]"
            style={{ borderColor: theme.yellow }}
          >
            <span
              className="absolute -top-2.5 left-4 text-[10px] font-black text-white px-2 py-0.5 rounded-full"
              style={{ backgroundColor: theme.yellow }}
            >
              仙佛慈語
            </span>
            <button
              onClick={() => onToggleFavorite(q.id)}
              aria-label={isFavorite ? '取消收藏' : '加入收藏'}
              aria-pressed={isFavorite}
              className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center text-xl cursor-pointer rounded-full active:scale-75 transition-transform"
            >
              {isFavorite ? '❤️' : '🤍'}
            </button>
            <p className="text-base font-black leading-relaxed" style={{ color: theme.dark }}>
              「{renderContent(q.content)}」
            </p>
            <p className="text-sm font-black text-right mt-2" style={{ color: theme.green }}>— {q.author}</p>
          </div>
        );
      })}
    </div>
  );
}
