import React, { useCallback, useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase-config';
import { theme } from '../styles/theme';
import { getTodayKey } from '../utils/gameLogic';
import { convertDriveUrl } from '../utils/driveUrl';
import { deleteEvent, describeAdminError, saveEvent } from '../services/adminEvents';
import EventModal from './EventModal';

const EMPTY_EVENT = { id: null, title: '', description: '', posterUrl: '', endDate: '' };

// 前台只顯示「沒有結束日期」或「結束日期還沒過」的活動
const isActive = (ev, today) => !ev.endDate || ev.endDate >= today;
const createdMs = (ev) => ev.createdAt?.toMillis?.() ?? 0;

const inputClass = 'w-full border-2 border-black rounded-2xl px-4 py-2.5 font-bold text-base focus:outline-none bg-gray-50';
const labelClass = 'block text-sm font-black mb-1.5';

/** 管理後台「近期活動」分頁 */
export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(null); // null = 顯示列表；物件 = 正在編輯 / 新增
  const [notice, setNotice] = useState(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const snap = await getDocs(collection(db, 'events'));
      const today = getTodayKey();
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        // 進行中的排前面，同一組裡新建立的排前面
        .sort((a, b) => (isActive(b, today) - isActive(a, today)) || (createdMs(b) - createdMs(a)));
      setEvents(list);
    } catch (err) {
      console.error('載入活動失敗:', err);
      setLoadError('載入活動失敗，請重新整理');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const finishEditing = (message) => {
    setEditing(null);
    setNotice(message);
    loadEvents();
  };

  if (editing) {
    return (
      <EventForm
        initial={editing}
        onCancel={() => setEditing(null)}
        onSaved={() => finishEditing(editing.id ? '✅ 活動已更新' : '✅ 活動已新增')}
        onDeleted={() => finishEditing('🗑 活動已刪除')}
      />
    );
  }

  const today = getTodayKey();

  return (
    <div>
      <div className="flex justify-between items-start gap-3 mb-4">
        <div>
          <h2 className="text-lg font-black" style={{ color: theme.dark }}>近期活動</h2>
          <p className="text-xs font-bold text-gray-400">已結束的活動不會出現在前台，但會保留在這裡。</p>
        </div>
        <button
          onClick={() => { setNotice(null); setEditing(EMPTY_EVENT); }}
          className="shrink-0 cursor-pointer px-4 py-2 rounded-xl border-2 border-black font-black text-sm text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
          style={{ backgroundColor: theme.green }}
        >
          ＋ 新增活動
        </button>
      </div>

      {notice && (
        <p className="mb-4 text-sm font-bold text-green-700 bg-green-50 border-2 border-green-200 rounded-2xl px-4 py-2.5">{notice}</p>
      )}

      {loading ? (
        <p className="text-center py-10 font-bold text-gray-400 animate-pulse">載入活動中...</p>
      ) : loadError ? (
        <p className="text-center py-10 font-bold text-red-600">{loadError}</p>
      ) : events.length === 0 ? (
        <p className="text-center py-10 font-bold text-gray-400 italic">還沒有任何活動</p>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => {
            const active = isActive(ev, today);
            return (
              <li key={ev.id}>
                <button
                  onClick={() => {
                    setNotice(null);
                    setEditing({
                      id: ev.id,
                      title: ev.title || '',
                      description: ev.description || '',
                      posterUrl: ev.posterUrl || '',
                      endDate: ev.endDate || '',
                    });
                  }}
                  className={`w-full text-left cursor-pointer p-3 border-2 border-black rounded-2xl flex gap-3 items-center bg-white hover:bg-gray-50 transition-colors ${active ? '' : 'opacity-50'}`}
                >
                  {ev.posterUrl ? (
                    <img src={ev.posterUrl} alt="" className="w-14 h-14 shrink-0 object-cover rounded-xl border-2 border-black bg-gray-100" />
                  ) : (
                    <div className="w-14 h-14 shrink-0 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-xl">📅</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-sm truncate" style={{ color: theme.dark }}>{ev.title || '（無標題）'}</p>
                    <p className="text-xs font-bold text-gray-400 mt-0.5">
                      {ev.endDate ? `顯示到 ${ev.endDate}` : '不會自動下架'}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-[11px] font-black px-2 py-1 rounded-full"
                    style={active ? { backgroundColor: theme.green, color: '#fff' } : { backgroundColor: '#e5e7eb', color: theme.dark }}
                  >
                    {active ? '顯示中' : '已結束'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EventForm({ initial, onCancel, onSaved, onDeleted }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [posterBroken, setPosterBroken] = useState(false);
  const isNew = !initial.id;

  const posterSrc = convertDriveUrl(form.posterUrl.trim());

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (field === 'posterUrl') setPosterBroken(false);
  };

  const run = async (action, onDone) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      onDone();
    } catch (err) {
      console.error('活動操作失敗:', err);
      setError(describeAdminError(err));
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      setError('請輸入活動標題');
      return;
    }
    run(() => saveEvent(form), onSaved);
  };

  const handleDelete = () => {
    if (!window.confirm(`確定要刪除「${form.title || '這個活動'}」嗎？刪除後無法復原。`)) return;
    run(() => deleteEvent(form.id), onDeleted);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-black" style={{ color: theme.dark }}>{isNew ? '新增活動' : '編輯活動'}</h2>
        <button onClick={onCancel} disabled={saving} className="text-sm font-black text-gray-400 cursor-pointer hover:text-black transition-colors">
          ← 返回列表
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className={labelClass} style={{ color: theme.dark }}>活動標題 *</label>
          <input value={form.title} onChange={update('title')} maxLength={100} className={inputClass} />
        </div>

        <div>
          <label className={labelClass} style={{ color: theme.dark }}>活動內容</label>
          <textarea value={form.description} onChange={update('description')} rows={10} maxLength={5000} className={`${inputClass} resize-y leading-relaxed`} />
          <p className="text-xs font-bold text-gray-400 mt-1">內容中的網址會自動變成「[點擊連結]」。</p>
        </div>

        <div>
          <label className={labelClass} style={{ color: theme.dark }}>海報圖片網址</label>
          <input value={form.posterUrl} onChange={update('posterUrl')} placeholder="https://..." className={inputClass} />
          <p className="text-xs font-bold text-gray-400 mt-1">可以直接貼 Google 雲端硬碟的分享連結（需設為「知道連結的任何人都能查看」）。</p>
          {posterSrc && (
            posterBroken ? (
              <p className="text-xs font-bold text-red-600 mt-2">⚠️ 圖片無法顯示，請確認連結正確且已公開分享。</p>
            ) : (
              <img src={posterSrc} alt="海報預覽" onError={() => setPosterBroken(true)} className="mt-3 max-h-60 rounded-xl border-2 border-black" />
            )
          )}
        </div>

        <div>
          <label className={labelClass} style={{ color: theme.dark }}>顯示到哪一天</label>
          <div className="flex gap-2 items-center">
            <input type="date" value={form.endDate} onChange={update('endDate')} className={`${inputClass} flex-1`} />
            {form.endDate && (
              <button onClick={() => setForm((prev) => ({ ...prev, endDate: '' }))} className="shrink-0 text-xs font-black text-gray-400 cursor-pointer hover:text-black px-2">
                清除
              </button>
            )}
          </div>
          <p className="text-xs font-bold text-gray-400 mt-1">過了這天前台就不會顯示；留空則一直顯示。</p>
        </div>

        {error && (
          <p className="text-sm font-bold text-red-600 bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-2.5">{error}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 min-w-[120px] cursor-pointer py-3 rounded-2xl border-2 border-black font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-wait"
            style={{ backgroundColor: theme.green }}
          >
            {saving ? '處理中...' : '儲存'}
          </button>
          <button
            onClick={() => setShowPreview(true)}
            disabled={saving}
            className="cursor-pointer px-5 py-3 rounded-2xl border-2 border-black font-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
            style={{ color: theme.dark }}
          >
            預覽
          </button>
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="cursor-pointer px-5 py-3 rounded-2xl border-2 border-red-300 font-black text-red-600 bg-red-50 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
            >
              刪除
            </button>
          )}
        </div>
      </div>

      {showPreview && (
        // 預覽時拿掉結束日期，避免已過期的活動被前台的過濾條件藏起來
        <EventModal
          events={[{ ...form, posterUrl: posterSrc, endDate: '' }]}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
