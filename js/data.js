/**
 * data.js — UI-side constants (Firebase config, edit password, derived options).
 *
 * Record-shape constants (status enum, normalize, sort) live in ./schema.js.
 */

export { STATUS_LABEL, STATUSES } from './schema.js';
import { STATUS_LABEL } from './schema.js';

// Firebase Web SDK 설정 — apiKey 등은 공개되어도 안전합니다 (Firestore Rules 가 보호).
export const firebaseConfig = {
  apiKey: 'AIzaSyDsTcgkarw35y6qKesWX0777Z1JO5Vgj_0',
  authDomain: 'swdp-seminar-dashboard.firebaseapp.com',
  projectId: 'swdp-seminar-dashboard',
  storageBucket: 'swdp-seminar-dashboard.firebasestorage.app',
  messagingSenderId: '197607304842',
  appId: '1:197607304842:web:26a45404f27e4e0e0c4773',
  measurementId: 'G-29QDC5CYRX',
};

export const SESSIONS_COLLECTION = 'sessions';

// 편집 잠금 해제 비밀번호. 변경 시 이 값만 바꾸고 재배포하면 됩니다.
export const EDIT_PASSWORD = 'aijjang';
export const PASSWORD_STORAGE_KEY = 'lecture-dashboard.editpw';

export const STATUS_OPTIONS = Object.entries(STATUS_LABEL).map(
  ([value, label]) => ({ value, label })
);
