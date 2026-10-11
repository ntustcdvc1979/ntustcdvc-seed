/**
 * 立刻重建慈語目錄（quote_catalog），並替所有新慈語計算向量。
 *
 * 平常不需要跑：慈語有變動時，Cloud Function 會在 10 分鐘內自動重建，
 * 每次最多替 80 則新慈語算向量。只有下面兩種情況才需要手動跑：
 *   - 想讓剛上傳的慈語「馬上」生效
 *   - 一次上傳了好幾百則，想一次算完（免費額度每分鐘 100 則，500 則約 5~6 分鐘）
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
import { rebuildCatalog } from '../catalog.js';
import { normalizeApiKey } from '../rag.js';

const apiKey = normalizeApiKey(process.env.GEMINI_API_KEY);
if (!apiKey) {
  console.error('❌ 請先設定環境變數 GEMINI_API_KEY，例如：$env:GEMINI_API_KEY="你的金鑰"; npm run build-index');
  process.exit(1);
}

const serviceAccountUrl = new URL('../../src/utils/serviceAccount.json', import.meta.url);
initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccountUrl, 'utf8'))) });
const db = getFirestore();

console.log('⏳ 重建慈語目錄中（有新慈語時，免費額度每分鐘只能算 100 則，請耐心等候）...');
const result = await rebuildCatalog(db, apiKey, {
  maxWaitMs: 5 * 60 * 1000,
  onProgress: (done, total) => console.log(`   向量 ${done} / ${total}`),
});

console.log(`📚 共 ${result.quoteCount} 則慈語，這次新算了 ${result.embedded} 則向量`);
if (result.missing > 0) {
  console.error(`❌ 還有 ${result.missing} 則沒有向量（可能是金鑰無效或額度用完），請先執行 npm run check-key 確認金鑰。`);
  console.error('   已完成的部分已經存檔，重新執行會接著處理。');
  process.exit(1);
}
console.log('✅ 慈語目錄已是最新狀態，網站會在 5 分鐘內載入新版本');
process.exit(0);
