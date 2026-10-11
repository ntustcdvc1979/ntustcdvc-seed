/** 近期活動的顯示規則（前台活動視窗與管理後台共用） */

/** 沒有結束日期，或結束日期還沒過的活動才會在前台顯示 */
export const isActiveEvent = (ev, today) => !ev.endDate || ev.endDate >= today;

const createdMs = (ev) => ev.createdAt?.toMillis?.() ?? 0;

/**
 * 排序：依後台調整的 order（越小越前面）；還沒排過序的舊活動放後面，新建立的在前。
 * （Infinity - Infinity 是 NaN，會自動落到第二個條件）
 */
export const compareEvents = (a, b) =>
  ((a.order ?? Infinity) - (b.order ?? Infinity)) || (createdMs(b) - createdMs(a));
