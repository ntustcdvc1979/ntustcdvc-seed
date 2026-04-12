import { db } from './firebase-config.js'; // 確保路徑正確
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

export const migrateUserShortIds = async () => {
  console.log("🚀 開始批量更新 shortId...");
  
  try {
    // 1. 抓取所有用戶
    const querySnapshot = await getDocs(collection(db, 'users'));
    const batch = writeBatch(db);
    let count = 0;

    querySnapshot.forEach((userDoc) => {
      const data = userDoc.data();
      
      // 2. 檢查是否已經有 shortId，若無則補上
      if (!data.shortId) {
        const userRef = doc(db, 'users', userDoc.id);
        const shortId = userDoc.id.substring(0, 6).toLowerCase();
        
        batch.update(userRef, { shortId: shortId });
        count++;
        console.log(`✅ 準備更新: ${data.name || '未知'} (${shortId})`);
      }
    });

    // 3. 提交批量更新
    if (count > 0) {
      await batch.commit();
      console.log(`🎉 成功更新了 ${count} 位用戶的 shortId！`);
    } else {
      console.log("✨ 所有用戶都已經有 shortId 了，無需更新。");
    }
  } catch (error) {
    console.error("❌ 批量更新發生錯誤:", error);
    alert("更新失敗，請查看控制台報錯。");
  }
};

migrateUserShortIds()