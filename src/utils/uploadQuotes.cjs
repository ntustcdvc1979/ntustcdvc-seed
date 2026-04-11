const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function uploadQuotes() {
  // 讀取本地 txt 檔案
  const data = fs.readFileSync('quotes.txt', 'utf8');
  const lines = data.split('\n').filter(line => line.trim() !== "");

  const batch = db.batch();
  lines.forEach((line) => {
    const [content, author, type] = line.split('|');
    const docRef = db.collection('daily_quotes').doc(); // 自動生成 ID
    batch.set(docRef, {
      content: content.trim(),
      author: author.trim(),
      type: type.trim(),
    });
  });

  await batch.commit();
  console.log('✅ 慈語批量上傳成功！');
}

uploadQuotes();