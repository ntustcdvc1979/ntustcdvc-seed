/**
 * 管理員設定。
 *
 * 這裡只用來決定「要不要顯示管理介面」，真正擋住非管理員修改資料的是 Firestore 規則。
 * 存的是 Email（小寫）的 SHA-256，避免把個人信箱以明文放進公開的前端程式碼；
 * 新增管理員時，用下面指令算出 hash 再加進陣列，並同步修改 Firestore 規則：
 *   node -e "console.log(require('crypto').createHash('sha256').update('someone@gmail.com').digest('hex'))"
 */
const ADMIN_EMAIL_SHA256 = [
  '624c47fbaa43460277cfb8659a783fb35c60dd528f72c6fa1bef5a071a46f96c',
];

/**
 * AI 慈語小助手的開放範圍：
 *   'admin' — 只有管理員看得到按鈕（Cloud Function 還在測試時用）
 *   'all'   — 所有登入的使用者
 */
export const AI_ROLLOUT = 'admin';

const sha256Hex = async (text) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

/** @returns {Promise<boolean>} */
export async function checkIsAdmin(user) {
  if (!user?.email || !user.emailVerified) return false;
  try {
    return ADMIN_EMAIL_SHA256.includes(await sha256Hex(user.email.trim().toLowerCase()));
  } catch {
    // crypto.subtle 只在 https / localhost 可用
    return false;
  }
}
