import { httpsCallable } from 'firebase/functions';
import { functions } from './functions';

const saveEventCallable = httpsCallable(functions, 'saveEvent');
const deleteEventCallable = httpsCallable(functions, 'deleteEvent');

/**
 * 新增（沒有 id）或修改（有 id）一個活動。
 * @returns {Promise<string>} 活動 id
 */
export async function saveEvent({ id, title, description, posterUrl, endDate }) {
  const { data } = await saveEventCallable({ id: id || null, title, description, posterUrl, endDate });
  return data.id;
}

export async function deleteEvent(id) {
  await deleteEventCallable({ id });
}

export function describeAdminError(err) {
  switch (err?.code) {
    case 'functions/invalid-argument':
    case 'functions/not-found':
    case 'functions/permission-denied':
      return err.message;
    case 'functions/unauthenticated':
      return '登入狀態已失效，請重新登入';
    default:
      return '儲存失敗，請稍後再試';
  }
}
