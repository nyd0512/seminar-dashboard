/**
 * store.js — Firestore-backed session store with client-side password gate.
 *
 * 읽기는 누구나 (Rules 도 동일).
 * 쓰기는 클라이언트에서 EDIT_PASSWORD 비교로 잠금 해제 (sessionStorage 보존).
 *
 * sessions 컬렉션은 onSnapshot 으로 구독해서 다른 탭/브라우저의 변경이 즉시 반영된다.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';

import { db } from './firebase.js';
import {
  SESSIONS_COLLECTION,
  EDIT_PASSWORD,
  PASSWORD_STORAGE_KEY,
} from './data.js';
import { normalize, compareSessions } from './schema.js';

const sessionsCol = collection(db, SESSIONS_COLLECTION);

let editUnlocked =
  sessionStorage.getItem(PASSWORD_STORAGE_KEY) === EDIT_PASSWORD;

let state = {
  sessions: [],
  loaded: false,
  error: null,
  editMode: editUnlocked,
};
const listeners = new Set();

function emit() {
  for (const l of listeners) l(state);
}

function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

function rowFromDoc(snap) {
  return normalize({ id: snap.id, ...snap.data() });
}

function stripId(row) {
  const { id, ...rest } = row;
  return rest;
}

export const store = {
  getState: () => state,

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getById(id) {
    return state.sessions.find((s) => s.id === id) || null;
  },

  isEditing: () => state.editMode,

  init() {
    return new Promise((resolve) => {
      let resolved = false;
      onSnapshot(
        sessionsCol,
        (snap) => {
          const list = snap.docs.map(rowFromDoc).sort(compareSessions);
          setState({ sessions: list, loaded: true, error: null });
          if (!resolved) {
            resolved = true;
            resolve();
          }
        },
        (err) => {
          console.error('[store] snapshot error', err);
          setState({ sessions: [], loaded: true, error: err });
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }
      );
    });
  },

  /**
   * 비밀번호 비교만으로 편집 모드 진입.
   * @returns true 면 잠금 해제 성공, false 면 비번 불일치
   */
  unlockEditing(password) {
    if (!password || password !== EDIT_PASSWORD) return false;
    editUnlocked = true;
    sessionStorage.setItem(PASSWORD_STORAGE_KEY, password);
    setState({ editMode: true });
    return true;
  },

  lockEditing() {
    editUnlocked = false;
    sessionStorage.removeItem(PASSWORD_STORAGE_KEY);
    setState({ editMode: false });
  },

  async create(input) {
    const row = normalize({ ...input, id: 'tmp' });
    const ref = await addDoc(sessionsCol, stripId(row));
    return { ...row, id: ref.id };
  },

  async update(id, input) {
    const existing = state.sessions.find((s) => s.id === id);
    if (!existing) {
      const e = new Error('not found');
      e.status = 404;
      throw e;
    }
    const merged = normalize({ ...existing, ...input, id });
    await updateDoc(doc(db, SESSIONS_COLLECTION, id), stripId(merged));
    return merged;
  },

  async remove(id) {
    await deleteDoc(doc(db, SESSIONS_COLLECTION, id));
    return { id, deleted: true };
  },
};
