/**
 * store.js — REST-backed session store with edit-mode gate.
 *
 * 읽기는 비공개 키 없이 누구나. 쓰기는 sessionStorage 에 저장된 편집 비밀번호를
 * X-Edit-Password 헤더로 실어 보낸다. 비번은 서버가 timingSafeEqual 로 검증.
 */

import {
  SESSIONS_URL,
  AUTH_URL,
  PASSWORD_HEADER,
  PASSWORD_STORAGE_KEY,
} from './data.js';
import { compareSessions } from './schema.js';

let editPassword = sessionStorage.getItem(PASSWORD_STORAGE_KEY) || '';

let state = {
  sessions: [],
  loaded: false,
  error: null,
  editMode: !!editPassword,
};
const listeners = new Set();

function emit() {
  for (const l of listeners) l(state);
}

function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

function authHeaders() {
  return editPassword ? { [PASSWORD_HEADER]: editPassword } : {};
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); }
    catch { body = { error: text }; }
  }
  if (!res.ok) {
    const err = new Error(body?.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
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

  async init() {
    try {
      const list = await jsonFetch(SESSIONS_URL, { cache: 'no-store' });
      setState({
        sessions: Array.isArray(list) ? list : [],
        loaded: true,
        error: null,
      });
    } catch (e) {
      console.error('[store] load failed', e);
      setState({ sessions: [], loaded: true, error: e });
    }
  },

  async unlockEditing(password) {
    if (!password) return false;
    try {
      await jsonFetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
    } catch (e) {
      if (e.status === 401) return false;
      throw e;
    }
    editPassword = password;
    sessionStorage.setItem(PASSWORD_STORAGE_KEY, password);
    if (!state.editMode) setState({ editMode: true });
    return true;
  },

  lockEditing() {
    if (!editPassword && !state.editMode) return;
    editPassword = '';
    sessionStorage.removeItem(PASSWORD_STORAGE_KEY);
    setState({ editMode: false });
  },

  async create(input) {
    const created = await jsonFetch(SESSIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(input),
    });
    setState({
      sessions: [...state.sessions, created].sort(compareSessions),
    });
    return created;
  },

  async update(id, input) {
    const updated = await jsonFetch(`${SESSIONS_URL}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(input),
    });
    setState({
      sessions: state.sessions
        .map((s) => (s.id === id ? updated : s))
        .sort(compareSessions),
    });
    return updated;
  },

  async remove(id) {
    await jsonFetch(`${SESSIONS_URL}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    setState({ sessions: state.sessions.filter((s) => s.id !== id) });
  },
};
