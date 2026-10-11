/**
 * 慈語目錄（quote_catalog）：把全部慈語與向量打包成少數幾份文件，大幅減少 Firestore 讀取次數。
 *
 *   quote_catalog/meta      版本、是否需要更新等資訊
 *   quote_catalog/text_N    慈語文字 [{ id, content, author, type }]（給抽卡、智慧錦囊、智慧語錄）
 *   quote_catalog/vec_N     向量 [{ id, hash, vector(Float32 二進位) }]（給萌芽解憂所）
 *
 * 讀一次目錄只要 1 + 文字份數 + 向量份數 次（515 則約 8 次），以前要 1,030 次。
 * daily_quotes 仍然是唯一的資料來源：目錄只是它的副本，慈語變動時會自動重建（見 index.js）。
 * 這個 collection 沒有開放給前端，只有 Cloud Function 能讀寫。
 */
import { createHash } from 'node:crypto';
import { EMBED_DIM, EMBED_MODEL, embedTexts, toPlainText } from './rag.js';

const CATALOG = 'quote_catalog';
// 每份文字文件放幾則（單份文件上限 1MB，一則約 250 bytes）
const TEXT_CHUNK = 1500;
// 每份向量文件放幾則（一則約 3KB）
const VECTOR_CHUNK = 100;
// 舊版每則一份文件的向量，第一次建立目錄時沿用，不必重新計算
const LEGACY_EMBEDDINGS = 'quote_embeddings';

export const metaRef = (db) => db.collection(CATALOG).doc('meta');
const chunkRef = (db, kind, i) => db.collection(CATALOG).doc(`${kind}_${i}`);

const contentHash = (content) => createHash('sha256').update(String(content)).digest('hex');

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

// Float32 二進位比 Firestore 的數字陣列小一半，讀取時也快很多
const encodeVector = (vector) => Buffer.from(new Float32Array(vector).buffer);
const decodeVector = (bytes) => {
  // 複製一份，避免來源 Buffer 的位移不是 4 的倍數
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return new Float32Array(copy.buffer);
};

/** 目前已存的向量：id → { hash, vector } */
async function loadStoredVectors(db, meta) {
  const stored = new Map();
  if (meta?.vectorChunks && meta.model === EMBED_MODEL) {
    const snaps = await db.getAll(...Array.from({ length: meta.vectorChunks }, (_, i) => chunkRef(db, 'vec', i)));
    for (const snap of snaps) {
      for (const item of snap.data()?.items || []) stored.set(item.id, { hash: item.hash, vector: decodeVector(item.vector) });
    }
  } else if (!meta?.vectorChunks) {
    // 第一次建立：沿用舊版的向量（只會發生一次）
    const legacy = await db.collection(LEGACY_EMBEDDINGS).get();
    for (const doc of legacy.docs) {
      const data = doc.data();
      if (data.model === EMBED_MODEL && data.vector?.length === EMBED_DIM) {
        stored.set(doc.id, { hash: data.hash, vector: Float32Array.from(data.vector) });
      }
    }
  }
  return stored;
}

/**
 * 從 daily_quotes 重建整份目錄。
 * @param {object} [options]
 * @param {number} [options.maxEmbed] 這次最多替幾則新慈語計算向量（免費額度每分鐘 100 則）
 * @param {number} [options.maxWaitMs] 碰到額度限制時最多等多久
 * @param {(done: number, total: number) => void} [options.onProgress]
 * @returns {Promise<{ quoteCount: number, embedded: number, missing: number }>}
 */
export async function rebuildCatalog(db, apiKey, { maxEmbed = Infinity, maxWaitMs = 0, onProgress } = {}) {
  const startedAt = Date.now();
  const meta = (await metaRef(db).get()).data();
  const [quotesSnap, stored] = await Promise.all([
    db.collection('daily_quotes').get(),
    loadStoredVectors(db, meta),
  ]);

  const quotes = [];
  const missing = [];
  for (const doc of quotesSnap.docs) {
    const q = doc.data();
    if (!q.content) continue;
    const item = { id: doc.id, content: q.content, author: q.author || '', type: q.type || '', hash: contentHash(q.content), vector: null };
    const saved = stored.get(doc.id);
    if (saved?.hash === item.hash) item.vector = saved.vector;
    else missing.push(item);
    quotes.push(item);
  }

  // 一批一批算，中途碰到額度用完就先停，已算好的照樣存起來
  let embedded = 0;
  const toEmbed = maxEmbed > 0 && apiKey ? missing.slice(0, maxEmbed) : [];
  for (const batch of chunk(toEmbed, 100)) {
    try {
      const vectors = await embedTexts(apiKey, batch.map((q) => toPlainText(q.content)), 'RETRIEVAL_DOCUMENT', { maxWaitMs });
      batch.forEach((q, i) => { q.vector = vectors[i]; });
      embedded += batch.length;
      onProgress?.(embedded, missing.length);
    } catch (err) {
      console.warn(`計算慈語向量中斷：${err.message}`);
      break;
    }
  }

  const textChunks = chunk(quotes.map(({ id, content, author, type }) => ({ id, content, author, type })), TEXT_CHUNK);
  const vectorChunks = chunk(
    quotes.filter((q) => q.vector).map((q) => ({ id: q.id, hash: q.hash, vector: encodeVector(q.vector) })),
    VECTOR_CHUNK,
  );

  const batch = db.batch();
  textChunks.forEach((items, i) => batch.set(chunkRef(db, 'text', i), { items }));
  vectorChunks.forEach((items, i) => batch.set(chunkRef(db, 'vec', i), { items }));
  // 慈語變少時，把多出來的舊分片刪掉
  for (let i = textChunks.length; i < (meta?.textChunks || 0); i++) batch.delete(chunkRef(db, 'text', i));
  for (let i = vectorChunks.length; i < (meta?.vectorChunks || 0); i++) batch.delete(chunkRef(db, 'vec', i));

  const missingCount = missing.length - embedded;
  batch.set(metaRef(db), {
    version: startedAt,
    // 這個時間點之前的變動都已經包含在目錄裡
    cleanAsOf: startedAt,
    quoteCount: quotes.length,
    missingEmbeddings: missingCount,
    lastRunEmbedded: embedded,
    textChunks: textChunks.length,
    vectorChunks: vectorChunks.length,
    model: EMBED_MODEL,
    builtAt: Date.now(),
  }, { merge: true });
  await batch.commit();

  return { quoteCount: quotes.length, embedded, missing: missingCount };
}

/**
 * 是否需要重建：慈語在上次重建後有變動，或還有向量沒算完且上一輪有進度
 * （上一輪完全沒進度，例如金鑰失效，就不要每次排程都白白重讀 500 多則）。
 */
export const needsRebuild = (meta) =>
  !meta?.version
  || (meta.dirtyAt || 0) > (meta.cleanAsOf || 0)
  || (meta.missingEmbeddings > 0 && meta.lastRunEmbedded > 0);

/** 依 meta 讀出整份目錄 */
export async function loadCatalog(db, meta) {
  const refs = [
    ...Array.from({ length: meta.textChunks || 0 }, (_, i) => chunkRef(db, 'text', i)),
    ...Array.from({ length: meta.vectorChunks || 0 }, (_, i) => chunkRef(db, 'vec', i)),
  ];
  const snaps = refs.length ? await db.getAll(...refs) : [];

  const quotes = [];
  const vectors = new Map();
  for (const snap of snaps) {
    const items = snap.data()?.items || [];
    if (snap.id.startsWith('text_')) quotes.push(...items);
    else items.forEach((item) => vectors.set(item.id, decodeVector(item.vector)));
  }

  const byId = new Map(quotes.map((q) => [q.id, q]));
  const withVectors = quotes.filter((q) => vectors.has(q.id)).map((q) => ({ ...q, vector: vectors.get(q.id) }));
  return { version: meta.version, quotes, byId, withVectors };
}
