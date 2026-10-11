/**
 * 建立 / 更新慈語向量索引（quote_embeddings）。
 *
 * 什麼時候要跑：第一次啟用 AI 小助手時，以及一次上傳超過 20 則新慈語之後。
 * 少量新增時 Cloud Function 會自己補，不需要手動跑。
 *
 * 用法（PowerShell，在 functions 目錄下）：
 *   $env:GEMINI_API_KEY="你的金鑰"; npm run build-index
 *
 * 金鑰只從環境變數讀取，不要寫進任何檔案。
 * Firestore 權限沿用 src/utils/serviceAccount.json（與上傳慈語的腳本相同）。
 */
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { deleteStaleEmbeddings, fillMissingEmbeddings, loadQuoteIndex } from '../quoteIndex.js';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ 請先設定環境變數 GEMINI_API_KEY，例如：$env:GEMINI_API_KEY="你的金鑰"; npm run build-index');
  process.exit(1);
}

const serviceAccountUrl = new URL('../../src/utils/serviceAccount.json', import.meta.url);
initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccountUrl, 'utf8'))) });
const db = getFirestore();

const { items, missing, staleIds } = await loadQuoteIndex(db);
console.log(`📚 共 ${items.length} 則慈語，需要計算向量：${missing.length} 則，需要清除的舊向量：${staleIds.length} 筆`);

if (staleIds.length > 0) {
  await deleteStaleEmbeddings(db, staleIds);
  console.log(`🧹 已清除 ${staleIds.length} 筆舊向量`);
}

if (missing.length > 0) {
  // 免費額度每分鐘只能算 100 則，碰到限制就等它恢復，所以 500 則大約要 5~6 分鐘
  console.log('⏳ 開始計算向量（免費額度每分鐘 100 則，請耐心等候）...');
  await fillMissingEmbeddings(db, apiKey, missing, {
    maxWaitMs: 5 * 60 * 1000,
    onProgress: (done, total) => console.log(`   ${done} / ${total}`),
  });
}

console.log('✅ 慈語索引已是最新狀態');
process.exit(0);
