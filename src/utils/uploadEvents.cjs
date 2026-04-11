const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "your-project-id.appspot.com" // 請替換成你的 Bucket ID
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Google Drive 連結轉換函式
const convertDriveUrl = (url) => {
  if (!url) return "";
  
  // 檢查是否為 Google Drive 連結
  const driveRegex = /\/file\/d\/([^\/]+)\/(?:view|edit)/;
  const match = url.match(driveRegex);
  
  if (match && match[1]) {
    const fileId = match[1];
    // 轉換為直接下載連結格式
    return `https://lh3.googleusercontent.com/u/0/d/${fileId}=w1000`; 
    // 備用格式（有時較慢）：`https://drive.google.com/uc?export=view&id=${fileId}`
  }
  
  // 如果不是 Drive 連結（例如是 Firebase Storage 或其他網址），原樣回傳
  return url;
};

// 修改：uploadEvents 函式中的處理邏輯
async function uploadEvents() {
  const data = fs.readFileSync('events.txt', 'utf8');
  
  const records = data.split('[[END_RECORD]]').filter(r => r.trim() !== "");

  for (const record of records) {
    const fields = record.split('[[END_FIELD]]');
    if (fields.length < 3) continue;

    const title = fields[0].trim();
    const description = fields[1].trim();
    const posterUrlFromTxt = fields[2].trim(); // txt 裡面的 Drive 分享連結

    console.log(`正在處理活動：${title}...`);

    // 【修改點】呼叫轉換函式
    const finalPosterUrl = convertDriveUrl(posterUrlFromTxt);

    // 寫入 Firestore (這裡我們假設不再透過腳本上傳圖片到 Storage，而是直接用 Drive 連結)
    await db.collection('events').add({
      title,
      description,
      posterUrl: finalPosterUrl, // 存入轉換後的直接連結
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ 上傳完成（使用 Google Drive 圖片）：${title}`);
  }
}

uploadEvents().catch(console.error);