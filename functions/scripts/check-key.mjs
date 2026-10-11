/**
 * 檢查 Gemini API 金鑰能不能用，順便實際跑一次 AI 小助手會用到的兩個步驟。
 * 存進 Secret Manager 之前先用這個確認，可以省掉「部署完才發現金鑰錯」的麻煩。
 *
 * 用法（PowerShell，在 functions 目錄下）：
 *   $env:GEMINI_API_KEY="你的金鑰"; npm run check-key
 *
 * 不會印出金鑰本身。
 */
import { CHAT_MODEL, EMBED_MODEL, embedTexts, isKeyError, normalizeApiKey, pickQuotes } from '../rag.js';

const raw = process.env.GEMINI_API_KEY;
if (!raw) {
  console.error('❌ 請先設定環境變數 GEMINI_API_KEY，例如：$env:GEMINI_API_KEY="你的金鑰"; npm run check-key');
  process.exit(1);
}

const apiKey = normalizeApiKey(raw);
console.log(`🔑 金鑰長度 ${apiKey.length}，開頭為「${apiKey.slice(0, 4)}…」`);
if (apiKey !== raw) {
  console.log('⚠️  原本的值前後有多餘的空白或引號，已自動去掉。');
  console.log('    執行 functions:secrets:set 時，請只貼金鑰本身，不要加引號。');
}

const fail = (step, err) => {
  console.error(`\n❌ ${step}失敗：${err.message}`);
  if (isKeyError(err)) {
    console.error('   這把金鑰無效（打錯、已被刪除或重新產生過）。');
    console.error('   請到 https://aistudio.google.com/apikey 確認或建立新的金鑰。');
  } else if (err.status === 404) {
    console.error(`   找不到模型，可能已下架。請到 functions/rag.js 修改 CHAT_MODEL / EMBED_MODEL。`);
  } else if (err.status === 429) {
    console.error('   超過免費額度了，等一分鐘（或明天）再試。');
  }
  process.exit(1);
};

try {
  const [vector] = await embedTexts(apiKey, ['最近壓力好大'], 'RETRIEVAL_QUERY');
  console.log(`✅ 向量化（${EMBED_MODEL}）正常，維度 ${vector.length}`);
} catch (err) {
  fail('向量化', err);
}

try {
  const candidates = [
    { content: '我們想要受到人家的尊重和敬愛，不是在於權勢，而是在於我們內在的修養。', author: '濟顛和尚' },
    { content: '修道就是很實際把孝道做好，百善孝為先，然後行善、積德，讓我們人生走向光明的康莊。', author: '濟公活佛' },
  ];
  const started = Date.now();
  const { reply, picked } = await pickQuotes(apiKey, '跟爸媽一直吵架怎麼辦', candidates);
  console.log(`✅ 挑選慈語（${CHAT_MODEL}）正常，花了 ${Date.now() - started}ms`);
  console.log(`   引言：${reply}`);
  console.log(`   挑中：${picked.map((i) => `第 ${i + 1} 則`).join('、') || '（沒有挑選）'}`);
} catch (err) {
  fail('挑選慈語', err);
}

console.log('\n🎉 金鑰可以正常使用！');
