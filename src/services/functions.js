import { getApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';
// 確保預設的 Firebase app 已經初始化
import '../firebase-config';

// 必須和 functions/index.js 的 region 一致
export const functions = getFunctions(getApp(), 'asia-east1');
