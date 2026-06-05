import React, { useState } from 'react';
import { FaInstagram, FaFacebook, FaLine } from 'react-icons/fa';
import { db } from '../firebase-config';
import { doc, updateDoc } from 'firebase/firestore';
import { auth } from '../firebase-config';

export default function SettingsModal({ onClose, onSignOut, userData, setUserData }) {
  const [newName, setNewName] = useState(userData?.name || "");

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { name: newName });
      
      // 更新本地狀態
      setUserData(prev => ({ ...prev, name: newName }));
    } catch (error) {
      console.error("更新失敗", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end">
      <div className="bg-white w-full max-w-[450px] mx-auto rounded-t-[3rem] p-10 border-t-8 border-black animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black italic">🌱 崇德心靈種子</h3>
          <button onClick={onClose} className="font-black cursor-pointer hover:opacity-50 transition-opacity text-2xl p-2">✕</button>
        </div>

        <div className="space-y-8">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-black text-gray-500">修改暱稱</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={10}
                className="flex-1 p-3 border-4 border-black rounded-xl font-bold"
              />
              <button 
                onClick={handleUpdateName}
                className="bg-black text-white px-4 rounded-xl font-black cursor-pointer"
              >
                儲存
              </button>
            </div>
          </div>
          
          {/* 社群連結部分 */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-xs font-black uppercase tracking-[0.2em]">追蹤台科大崇德志工社，獲取更多活動資訊</p>
            <div className="flex gap-6">
              {[
                { icon: <FaInstagram />, color: '#E1306C', url: 'https://www.instagram.com/ntustcdvc' },
                { icon: <FaFacebook />, color: '#1877F2', url: 'https://www.facebook.com/cdvcntust' },
                { icon: <FaLine />, color: '#00B900', url: 'https://line.me/ti/g2/zovx0m_zdGqe-VDGrtJxYPafrxfIt5JM9Z3n2g?utm_source=invitation&utm_medium=link_copy&utm_campaign=default' }
              ].map((social, i) => (
                <a key={i} href={social.url} target="_blank" rel="noopener noreferrer" 
                   className="w-14 h-14 rounded-full bg-white border-4 border-black flex items-center justify-center text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
                  <span style={{ color: social.color }}>{social.icon}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="h-[2px] bg-gray-100 w-full" />

          {/* 系統操作 */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={onSignOut}
              className="w-full cursor-pointer py-4 bg-red-50 text-red-600 rounded-2xl font-black border-2 border-red-200 hover:bg-red-600 hover:text-white transition-all"
            >
              登出系統
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}