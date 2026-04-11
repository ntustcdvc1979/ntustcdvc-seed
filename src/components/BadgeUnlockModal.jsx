import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeImages } from '../assets/AssetManager'; // 確保這裡有 Icon
import { theme } from '../styles/theme';

export default function BadgeUnlockModal({ badgeName, onClose }) {
  if (!badgeName) return null;

  const imgSrc = BadgeImages[badgeName];

  return (
    <AnimatePresence>
      <motion.div
        // 全螢幕背景
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl p-10 text-center cursor-pointer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose} // 點擊任意處關閉
      >
        {/* 發光背景效果 */}
        <motion.div
          className="absolute w-64 h-64 rounded-full"
          style={{ backgroundColor: theme.yellow, filter: 'blur(100px)', opacity: 0.3 }}
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* 勳章主體動畫 */}
        <motion.div
          className="relative z-10 flex flex-col items-center"
          initial={{ scale: 0.5, y: 50, rotate: -10 }}
          animate={{ scale: 1, y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <img 
            src={imgSrc} 
            alt={badgeName} 
            className="w-56 h-56 object-contain drop-shadow-[0_0_35px_rgba(245,190,48,0.8)]"
          />
          
          <motion.h2 
            className="mt-10 text-5xl font-black text-white tracking-widest"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            恭喜解鎖！
          </motion.h2>

          <motion.div 
            className="mt-5 text-[15px] font-black px-6 py-2 rounded-full shadow-lg border border-white transform -rotate-2"
            style={{ backgroundColor: theme.green, color: '#fff' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            【 {badgeName} 】勳章
          </motion.div>

          <p className="mt-12 text-gray-400 text-sm font-black animate-pulse">
            點擊任意處繼續
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}