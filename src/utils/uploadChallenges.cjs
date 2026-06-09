const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function uploadChallenges() {
  // 讀取本地 txt 檔案（每一行就是一個考驗題目）
  const data = fs.readFileSync('challenges.txt', 'utf8');
  const lines = data.split('\n').filter(line => line.trim() !== "");

  const batch = db.batch();
  lines.forEach((line) => {
    const docRef = db.collection('challenges').doc(); // 自動生成 ID
    batch.set(docRef, {
      content: line.trim() // 只需要一個欄位
    });
  });

  await batch.commit();
  console.log('✅ 考驗題目批量上傳成功！');
}

uploadChallenges();