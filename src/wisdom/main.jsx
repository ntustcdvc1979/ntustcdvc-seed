/**
 * 「智慧語錄」頁面的進入點（wisdom.html）。
 * 不需要登入，所以不載入 Google 登入與 Firestore，只用 Cloud Function 取得一般慈語，
 * 在 LINE 等 App 內建瀏覽器裡掃 QR Code 打開也能直接使用。
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { firebaseOptions } from '../firebase-options';
import '../index.css';
import WisdomPage from './WisdomPage';

initializeApp(firebaseOptions);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WisdomPage />
  </StrictMode>,
);
