import React, { useEffect, useRef, useState } from 'react';
import { theme } from '../styles/theme';
import { renderContent } from './utils';
import { askQuotes, describeAiError } from '../services/aiAssistant';

const SUGGESTIONS = [
  '最近壓力好大，該怎麼調適？',
  '跟家人一直吵架怎麼辦？',
  '做事總是提不起勁',
  '怎麼面對別人的誤會？',
];

const MAX_LENGTH = 300;

export default function AiChatModal({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const send = async (text) => {
    const question = text.trim();
    if (!question || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setLoading(true);
    try {
      const { reply, quotes } = await askQuotes(question);
      setMessages((prev) => [...prev, { role: 'assistant', reply, quotes: quotes || [] }]);
    } catch (err) {
      console.error('AI 小助手失敗:', err);
      setMessages((prev) => [...prev, { role: 'error', text: describeAiError(err) }]);
    } finally {
      setLoading(false);
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
        <div className="flex justify-between items-center px-6 pt-6 pb-3 border-b-2 border-gray-100">
          <div>
            <h3 className="text-xl font-black" style={{ color: theme.dark }}>✨ 慈語小助手</h3>
            <p className="text-xs font-bold text-gray-400 mt-0.5">說說你的煩惱，為你找一則仙佛慈語</p>
          </div>
          <button onClick={onClose} className="font-black text-2xl p-2 cursor-pointer hover:opacity-50 transition-opacity">✕</button>
        </div>

        {/* 對話內容 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <div className="pt-4">
              <p className="text-sm font-black text-gray-400 mb-3 text-center">可以試著問我：</p>
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

          {messages.map((msg, i) => <Message key={i} msg={msg} />)}

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
              placeholder="輸入你的問題..."
              rows={1}
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

function Message({ msg }) {
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
      {msg.quotes.map((q) => (
        <div
          key={q.id}
          className="relative p-4 pt-5 rounded-2xl border-2 bg-[#fffdf5]"
          style={{ borderColor: theme.yellow }}
        >
          <span
            className="absolute -top-2.5 left-4 text-[10px] font-black text-white px-2 py-0.5 rounded-full"
            style={{ backgroundColor: theme.yellow }}
          >
            仙佛慈語
          </span>
          <p className="text-base font-black leading-relaxed" style={{ color: theme.dark }}>
            「{renderContent(q.content)}」
          </p>
          <p className="text-sm font-black text-right mt-2" style={{ color: theme.green }}>— {q.author}</p>
        </div>
      ))}
    </div>
  );
}
