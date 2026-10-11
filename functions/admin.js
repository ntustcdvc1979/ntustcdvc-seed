import { createHash } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';

// 與 src/config/admin.js 相同：管理員 Email（小寫）的 SHA-256，避免把個人信箱以明文放進 git。
// 新增管理員時兩邊都要加。
const ADMIN_EMAIL_SHA256 = [
  '624c47fbaa43460277cfb8659a783fb35c60dd528f72c6fa1bef5a071a46f96c',
];

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

/** 不是管理員就丟出錯誤；身分以 Firebase Auth 的登入憑證為準，不相信前端傳來的任何值 */
export function requireAdmin(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', '請先登入');

  const { email, email_verified: emailVerified } = request.auth.token;
  const isAdmin = emailVerified === true
    && typeof email === 'string'
    && ADMIN_EMAIL_SHA256.includes(sha256(email.trim().toLowerCase()));
  if (!isAdmin) throw new HttpsError('permission-denied', '只有管理員可以執行這個操作');

  return request.auth.uid;
}
