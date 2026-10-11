/**
 * 慈語向量索引的讀寫。向量存在 quote_embeddings/{慈語 id}，
 * 跟 daily_quotes 分開放，避免前端讀慈語時連同一大串向量一起下載。
 * 這個 collection 沒有開放給前端，Firestore 規則預設就會擋下。
 */
import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { EMBED_DIM, EMBED_MODEL, embedTexts, toPlainText } from './rag.js';

export const EMBEDDINGS_COLLECTION = 'quote_embeddings';

// 一次 embedding 批次的大小，同時也是寫回 Firestore 的單位（中途失敗時已完成的部分不會白做）
const CHUNK_SIZE = 100;

const contentHash = (content) => createHash('sha256').update(String(content)).digest('hex');

/**
 * 讀出全部慈語，並配上已經算好的向量。
 * 慈語內容改過（hash 不同）或換了 embedding 模型的，會被當作「缺少向量」重新計算。
 */
export async function loadQuoteIndex(db) {
  const [quotesSnap, embeddingsSnap] = await Promise.all([
    db.collection('daily_quotes').get(),
    db.collection(EMBEDDINGS_COLLECTION).get(),
  ]);

  const stored = new Map(embeddingsSnap.docs.map((d) => [d.id, d.data()]));
  const items = [];
  const missing = [];

  for (const doc of quotesSnap.docs) {
    const quote = doc.data();
    if (!quote.content) continue;

    const item = {
      id: doc.id,
      content: quote.content,
      author: quote.author || '',
      type: quote.type || '',
      vector: null,
    };
    const emb = stored.get(doc.id);
    if (emb?.hash === contentHash(quote.content) && emb.model === EMBED_MODEL && emb.vector?.length === EMBED_DIM) {
      item.vector = emb.vector;
    } else {
      missing.push(item);
    }
    items.push(item);
  }

  const quoteIds = new Set(items.map((item) => item.id));
  const staleIds = [...stored.keys()].filter((id) => !quoteIds.has(id));

  return { items, missing, staleIds };
}

/** 替缺少向量的慈語算向量並寫回（會直接填入 item.vector） */
export async function fillMissingEmbeddings(db, apiKey, missing, { maxWaitMs = 0, timeoutMs, onProgress } = {}) {
  for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
    const chunk = missing.slice(i, i + CHUNK_SIZE);
    const vectors = await embedTexts(
      apiKey,
      chunk.map((item) => toPlainText(item.content)),
      'RETRIEVAL_DOCUMENT',
      { maxWaitMs, timeoutMs },
    );

    const batch = db.batch();
    chunk.forEach((item, j) => {
      item.vector = vectors[j];
      batch.set(db.collection(EMBEDDINGS_COLLECTION).doc(item.id), {
        vector: item.vector,
        hash: contentHash(item.content),
        model: EMBED_MODEL,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    onProgress?.(Math.min(i + CHUNK_SIZE, missing.length), missing.length);
  }
}

/** 慈語被刪掉之後，把對應的向量也清掉 */
export async function deleteStaleEmbeddings(db, staleIds) {
  for (let i = 0; i < staleIds.length; i += 400) {
    const batch = db.batch();
    staleIds.slice(i, i + 400).forEach((id) => batch.delete(db.collection(EMBEDDINGS_COLLECTION).doc(id)));
    await batch.commit();
  }
}
