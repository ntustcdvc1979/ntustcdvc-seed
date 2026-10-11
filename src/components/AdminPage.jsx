import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { theme } from '../styles/theme';
import AdminEvents from './AdminEvents';
import AdminQrCode from './AdminQrCode';

const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'taoqin', label: '道親' },
  { id: 'non', label: '非道親' },
];

const describeSaveError = (err) =>
  err?.code === 'permission-denied'
    ? '權限不足：請確認已在 Firebase Console 發布新版 Firestore 規則（專案根目錄的 firestore.rules）'
    : `儲存失敗：${err?.message || '未知錯誤'}`;

/**
 * 管理後台（網址 #/admin）。
 * @param {boolean|null} isAdmin null 代表還在確認身分
 */
export default function AdminPage({ isAdmin, onExit }) {
  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-10 h-10 border-4 border-[#bad32d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-8 text-center">
        <p className="text-5xl mb-4">🔒</p>
        <p className="font-black text-lg mb-6" style={{ color: theme.dark }}>這個頁面只有管理員可以使用</p>
        <button onClick={onExit} className="bg-black text-white px-10 py-3 rounded-full font-black cursor-pointer">
          回到種子
        </button>
      </div>
    );
  }

  return <AdminConsole onExit={onExit} />;
}

const TABS = [
  { id: 'taoqin', label: '👥 道親', Component: TaoQinManager },
  { id: 'events', label: '📅 活動', Component: AdminEvents },
  { id: 'qrcode', label: '📱 語錄 QR', Component: AdminQrCode },
];

function AdminConsole({ onExit }) {
  const [tab, setTab] = useState('taoqin');

  return (
    <div className="min-h-screen w-full bg-[#fffdf5] flex justify-center p-4 sm:p-6">
      <div className="w-full max-w-[600px] flex flex-col">
        <header className="flex justify-between items-center mb-5">
          <h1 className="text-2xl font-black" style={{ color: theme.dark }}>🛠 管理後台</h1>
          <button
            onClick={onExit}
            className="cursor-pointer bg-white border-2 border-black px-4 py-1.5 rounded-full font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
          >
            ← 回到種子
          </button>
        </header>

        <div className="flex gap-2 mb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 cursor-pointer py-2.5 rounded-2xl border-2 border-black font-black text-sm transition-all ${tab === t.id ? 'bg-black text-white' : 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white border-4 border-black rounded-[2rem] p-5 sm:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
          {/* 切換分頁時只隱藏、不卸載，回到原分頁不必重新讀取資料 */}
          {TABS.map((t) => (
            <div key={t.id} className={tab === t.id ? '' : 'hidden'}>
              <t.Component />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TaoQinManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [savingUid, setSavingUid] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;
    getDocs(collection(db, 'users'))
      .then((snap) => {
        if (!isMounted) return;
        const list = snap.docs
          .map((d) => ({ uid: d.id, ...d.data() }))
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-Hant'));
        setUsers(list);
      })
      .catch((err) => {
        console.error('載入使用者失敗:', err);
        if (isMounted) setLoadError('載入使用者失敗，請重新整理');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const counts = useMemo(() => {
    const taoqin = users.filter((u) => u.isTaoQin === true).length;
    return { all: users.length, taoqin, non: users.length - taoqin };
  }, [users]);

  const visibleUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === 'taoqin' && u.isTaoQin !== true) return false;
      if (filter === 'non' && u.isTaoQin === true) return false;
      if (!keyword) return true;
      return (u.name || '').toLowerCase().includes(keyword) || (u.email || '').toLowerCase().includes(keyword);
    });
  }, [users, search, filter]);

  const toggleTaoQin = async (target) => {
    const next = target.isTaoQin !== true;
    setSaveError(null);
    setSavingUid(target.uid);
    // 先更新畫面，失敗再改回來
    setUsers((prev) => prev.map((u) => (u.uid === target.uid ? { ...u, isTaoQin: next } : u)));
    try {
      await updateDoc(doc(db, 'users', target.uid), { isTaoQin: next });
    } catch (err) {
      console.error('更新道親身分失敗:', err);
      setUsers((prev) => prev.map((u) => (u.uid === target.uid ? { ...u, isTaoQin: target.isTaoQin } : u)));
      setSaveError(describeSaveError(err));
    } finally {
      setSavingUid(null);
    }
  };

  return (
    <>
      <h2 className="text-lg font-black mb-1" style={{ color: theme.dark }}>道親身分管理</h2>
      <p className="text-xs font-bold text-gray-400 mb-4">
        非道親只會抽到一般慈語；修改後，對方下次開啟網頁時生效。
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜尋名字或 Email..."
        className="w-full border-2 border-black rounded-2xl px-4 py-2.5 font-black text-base focus:outline-none bg-gray-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-4"
      />

      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`cursor-pointer px-3 py-1.5 rounded-full border-2 border-black font-black text-sm transition-all ${filter === f.id ? 'bg-black text-white' : 'bg-white'}`}
          >
            {f.label} {counts[f.id]}
          </button>
        ))}
      </div>

      {saveError && (
        <p className="mb-4 text-sm font-bold text-red-600 bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-2.5">
          {saveError}
        </p>
      )}

      {loading ? (
        <p className="text-center py-10 font-bold text-gray-400 animate-pulse">載入使用者中...</p>
      ) : loadError ? (
        <p className="text-center py-10 font-bold text-red-600">{loadError}</p>
      ) : visibleUsers.length === 0 ? (
        <p className="text-center py-10 font-bold text-gray-400 italic">無相符結果</p>
      ) : (
        <ul className="space-y-3">
          {visibleUsers.map((u) => (
            <UserRow key={u.uid} user={u} saving={savingUid === u.uid} onToggle={() => toggleTaoQin(u)} />
          ))}
        </ul>
      )}
    </>
  );
}

function UserRow({ user, saving, onToggle }) {
  const isTaoQin = user.isTaoQin === true;
  const level = Math.floor((user.exp || 0) / 5) + 1;

  return (
    <li className="p-3 border-2 border-black rounded-2xl flex justify-between items-center gap-3 bg-white">
      <div className="min-w-0">
        <p className="font-black text-sm truncate" style={{ color: theme.dark }}>
          {user.name || '未知用戶'}
          <span className="ml-2 text-xs font-bold" style={{ color: theme.green }}>LV.{level}</span>
        </p>
        {user.email && <p className="text-xs font-bold text-gray-400 truncate">{user.email}</p>}
      </div>
      <button
        onClick={onToggle}
        disabled={saving}
        aria-pressed={isTaoQin}
        className="shrink-0 cursor-pointer w-24 py-1.5 rounded-xl border-2 border-black font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-wait"
        style={isTaoQin ? { backgroundColor: theme.green, color: '#fff' } : { backgroundColor: '#e5e7eb', color: theme.dark }}
      >
        {isTaoQin ? '道親' : '非道親'}
      </button>
    </li>
  );
}
