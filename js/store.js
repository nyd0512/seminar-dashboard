/**
 * store.js — read-only session loader
 *
 * data/sessions.json 을 fetch 해서 정규화하고 구독자에게 전달한다.
 * 편집/삭제 API 없음 — 데이터 변경은 저장소의 JSON 파일을 직접 수정한다.
 */

import { DATA_URL } from './data.js';

let state = { sessions: [], loaded: false, error: null };
const listeners = new Set();

function emit() {
  for (const l of listeners) l(state);
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

  async init() {
    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = await res.json();
      const list = Array.isArray(parsed) ? parsed : parsed.sessions;
      if (!Array.isArray(list)) throw new Error('invalid shape');
      state = { sessions: list.map(normalize), loaded: true, error: null };
    } catch (e) {
      console.error('[store] load failed', e);
      state = { sessions: [], loaded: true, error: e };
    }
    emit();
  },
};

function normalize(s) {
  return {
    id: String(s.id || ''),
    title: String(s.title || '').trim(),
    topic: s.topic ? String(s.topic).trim() : '',
    date: String(s.date || ''),
    startTime: s.startTime || '',
    endTime: s.endTime || '',
    isOnline: s.isOnline === true || s.isOnline === 'true',
    location: s.location ? String(s.location).trim() : '',
    instructor: s.instructor ? String(s.instructor).trim() : '',
    audience: s.audience ? String(s.audience).trim() : '',
    enrolled: Number(s.enrolled) || 0,
    capacity: Number(s.capacity) || 0,
    status: ['scheduled', 'ongoing', 'completed'].includes(s.status)
      ? s.status
      : 'scheduled',
    description: s.description ? String(s.description) : '',
  };
}
