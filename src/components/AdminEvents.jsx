import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase-config';
import { theme } from '../styles/theme';
import { getTodayKey } from '../utils/gameLogic';
import { convertDriveUrl } from '../utils/driveUrl';
import { compareEvents, isActiveEvent } from '../utils/events';
import { deleteEvent, describeAdminError, reorderEvents, saveEvent } from '../services/adminEvents';
import EventModal from './EventModal';
import ConfirmDialog from './ConfirmDialog';

const EMPTY_EVENT = { id: null, title: '', description: '', posterUrl: '', endDate: '' };

const ORDER_STATUS_TEXT = {
  saving: '儲存順序中...',
  saved: '✅ 順序已儲存',
  error: '⚠️ 順序儲存失敗，請重新整理後再試',
};

const arrowClass = 'w-8 h-7 flex items-center justify-center rounded-lg border-2 border-black bg-white font-black text-xs cursor-pointer active:translate-y-0.5 transition-all disabled:opacity-20 disabled:cursor-not-allowed';

const inputClass = 'w-full border-2 border-black rounded-2xl px-4 py-2.5 font-bold text-base focus:outline-none bg-gray-50';
const labelClass = 'block text-sm font-black mb-1.5';

/** 管理後台「近期活動」分頁 */
export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(null); // null = 顯示列表；物件 = 正在編輯 / 新增
  const [notice, setNotice] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null); // null | saving | saved | error
  const savingOrder = useRef(false);
  const pendingOrder = useRef(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const snap = await getDocs(collection(db, 'events'));
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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

  const today = getTodayKey();
  // 前台顯示中的活動可以調整順序；已結束的另外列在下面
  const activeEvents = useMemo(() => events.filter((ev) => isActiveEvent(ev, today)).sort(compareEvents), [events, today]);
  const endedEvents = useMemo(() => events.filter((ev) => !isActiveEvent(ev, today)).sort(compareEvents), [events, today]);

  /**
   * 儲存順序。連續點很多下時，同一時間只送一個請求，
   * 送完再補送「最後一次」的順序，避免舊的請求比較晚完成而蓋掉新的順序。
   */
  const persistOrder = async (ids) => {
    pendingOrder.current = ids;
    if (savingOrder.current) return;
    savingOrder.current = true;
    setOrderStatus('saving');
    try {
      while (pendingOrder.current) {
        const next = pendingOrder.current;
        pendingOrder.current = null;
        await reorderEvents(next);
      }
      setOrderStatus('saved');
    } catch (err) {
      console.error('儲存活動順序失敗:', err);
      pendingOrder.current = null;
      setOrderStatus('error');
    } finally {
      savingOrder.current = false;
    }
  };

  const moveEvent = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= activeEvents.length) return;
    const reordered = [...activeEvents];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    const orderById = new Map(reordered.map((ev, i) => [ev.id, i]));
    setEvents((prev) => prev.map((ev) => (orderById.has(ev.id) ? { ...ev, order: orderById.get(ev.id) } : ev)));
    setNotice(null);
    persistOrder(reordered.map((ev) => ev.id));
  };

  const openEditor = (ev) => {
    setNotice(null);
    setOrderStatus(null);
    setEditing(ev
      ? { id: ev.id, title: ev.title || '', description: ev.description || '', posterUrl: ev.posterUrl || '', endDate: ev.endDate || '' }
      : EMPTY_EVENT);
  };

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

  return (
    <div>
      <div className="flex justify-between items-start gap-3 mb-4">
        <div>
          <h2 className="text-lg font-black" style={{ color: theme.dark }}>近期活動</h2>
          <p className="text-xs font-bold text-gray-400">用 ▲▼ 調整前台的顯示順序，會自動儲存。</p>
        </div>
        <button
          onClick={() => openEditor(null)}
          className="shrink-0 cursor-pointer px-4 py-2 rounded-xl border-2 border-black font-black text-sm text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
          style={{ backgroundColor: theme.green }}
        >
          ＋ 新增活動
        </button>
      </div>

      {notice && (
        <p className="mb-4 text-sm font-bold text-green-700 bg-green-50 border-2 border-green-200 rounded-2xl px-4 py-2.5">{notice}</p>
      )}
      {orderStatus && (
        <p className={`mb-4 text-xs font-black ${orderStatus === 'error' ? 'text-red-600' : 'text-gray-400'}`}>
          {ORDER_STATUS_TEXT[orderStatus]}
        </p>
      )}

      {loading ? (
        <p className="text-center py-10 font-bold text-gray-400 animate-pulse">載入活動中...</p>
      ) : loadError ? (
        <p className="text-center py-10 font-bold text-red-600">{loadError}</p>
      ) : events.length === 0 ? (
        <p className="text-center py-10 font-bold text-gray-400 italic">還沒有任何活動</p>
      ) : (
        <>
          <p className="text-sm font-black text-gray-400 tracking-widest mb-2">顯示中（{activeEvents.length}）</p>
          {activeEvents.length === 0 ? (
            <p className="text-center py-6 font-bold text-gray-400 italic text-sm">目前前台沒有活動</p>
          ) : (
            <ul className="space-y-3">
              {activeEvents.map((ev, index) => (
                <li key={ev.id} className="flex gap-2 items-center">
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => moveEvent(index, -1)} disabled={index === 0} aria-label="往前移" className={arrowClass}>▲</button>
                    <button onClick={() => moveEvent(index, 1)} disabled={index === activeEvents.length - 1} aria-label="往後移" className={arrowClass}>▼</button>
                  </div>
                  <EventRow ev={ev} active onClick={() => openEditor(ev)} />
                </li>
              ))}
            </ul>
          )}

          {endedEvents.length > 0 && (
            <>
              <p className="text-sm font-black text-gray-400 tracking-widest mt-8 mb-1">已結束（{endedEvents.length}）</p>
              <p className="text-xs font-bold text-gray-400 mb-2">不會出現在前台；把結束日期往後改或清空，就會重新上架。</p>
              <ul className="space-y-3">
                {endedEvents.map((ev) => (
                  <li key={ev.id} className="flex">
                    <EventRow ev={ev} active={false} onClick={() => openEditor(ev)} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

function EventRow({ ev, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-0 text-left cursor-pointer p-3 border-2 border-black rounded-2xl flex gap-3 items-center bg-white hover:bg-gray-50 transition-colors ${active ? '' : 'opacity-50'}`}
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
    </button>
  );
}

function EventForm({ initial, onCancel, onSaved, onDeleted }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [posterBroken, setPosterBroken] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

  const handleDelete = async () => {
    await run(() => deleteEvent(form.id), onDeleted);
    // 成功時整個表單已關閉；失敗時關掉確認視窗，讓錯誤訊息看得到
    setShowDeleteConfirm(false);
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
              onClick={() => setShowDeleteConfirm(true)}
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

      {showDeleteConfirm && (
        <ConfirmDialog
          title="確認刪除？"
          message={`「${form.title || '這個活動'}」會被永久刪除，無法復原。`}
          confirmLabel="確認刪除"
          busy={saving}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
