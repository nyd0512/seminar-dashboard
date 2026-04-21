/**
 * utils.js — date, dom, format helpers
 */

/* ================= DATE ================= */

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const toDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

export const parseDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayKey = () => toDateKey(new Date());

/** Return 42 cells (6 rows × 7 days) starting from Sunday for month view. */
export const monthCells = (year, month /* 0-11 */) => {
  const first = new Date(year, month, 1);
  const offset = first.getDay();
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d, inMonth: d.getMonth() === month, key: toDateKey(d) };
  });
};

export const addMonths = (d, n) => {
  const nd = new Date(d);
  nd.setDate(1);
  nd.setMonth(nd.getMonth() + n);
  return nd;
};

export const formatMonth = (d) => `${d.getFullYear()}년 ${d.getMonth() + 1}월`;

export const formatDateKo = (s) => {
  const d = parseDate(s);
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}. ${String(d.getDate()).padStart(2, '0')} (${KO_WEEKDAYS[d.getDay()]})`;
};

export const formatTimeRange = (s, e) => {
  if (!s && !e) return '';
  if (s && !e) return s;
  if (!s && e) return `~ ${e}`;
  return `${s} – ${e}`;
};

export const relativeKo = (s) => {
  const target = parseDate(s);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((target - now) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '내일';
  if (diff > 1 && diff < 14) return `D-${diff}`;
  if (diff < 0 && diff > -14) return `${-diff}일 전`;
  return '';
};

/* ================= DOM ================= */

export const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'on') {
      for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
    } else if (k === 'text') node.textContent = v;
    else if (k in node && typeof v !== 'string') node[k] = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  const list = Array.isArray(children) ? children : [children];
  for (const c of list) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
};

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const clear = (node) => {
  while (node.firstChild) node.removeChild(node.firstChild);
};

export const debounce = (fn, delay = 200) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
};
