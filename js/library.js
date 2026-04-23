/**
 * library.js — 자료실(열람실) 뷰.
 *
 * presentations/files/manifest.json 을 fetch 해서 카드 그리드로 렌더.
 * manifest 는 predeploy hook(scripts/build-materials-manifest.mjs) 으로 생성.
 *   - type='slide' 항목: 발표자료 HTML, 클릭 시 새 탭 이동 (presentations/index.html 에서 자동 수집)
 *   - type='file'  항목: 다운로드 파일 (presentations/files/)
 */

import { store } from './store.js';
import { el, $, clear } from './utils.js';

const MANIFEST_URL = './presentations/files/manifest.json';

let cached = null;

const EXT_ICON = {
  pdf: '📄',
  ppt: '📊', pptx: '📊',
  doc: '📝', docx: '📝',
  xls: '📈', xlsx: '📈', csv: '📈',
  mp4: '🎬', mov: '🎬', m4v: '🎬', webm: '🎬',
  mp3: '🎧', m4a: '🎧', wav: '🎧',
  png: '🖼️', jpg: '🖼️', jpeg: '🖼️', webp: '🖼️', gif: '🖼️', svg: '🖼️',
  zip: '🗜️', tar: '🗜️', gz: '🗜️',
  md: '📖', txt: '📖',
  html: '🎯',
};

function iconFor(item) {
  if (item.type === 'slide') return '🎯';
  return EXT_ICON[item.ext] || '📁';
}

function fmtSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function fmtDate(iso) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

async function loadManifest() {
  if (cached) return cached;
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cached = await res.json();
  } catch (e) {
    console.warn('[library] manifest 로드 실패', e);
    cached = { items: [], count: 0, error: e.message };
  }
  return cached;
}

function metaForCard(item) {
  const parts = [];
  if (item.category) parts.push({ cls: 'library-card-cat', text: item.category });
  if (item.type === 'slide') {
    if (item.subtitle) parts.push({ text: item.subtitle });
  } else {
    parts.push({ text: (item.ext || '').toUpperCase() });
    if (item.size != null) parts.push({ text: fmtSize(item.size) });
    if (item.date) parts.push({ text: fmtDate(item.date) });
  }
  const out = [];
  parts.forEach((p, i) => {
    if (i > 0) out.push(el('span', { class: 'dot' }));
    out.push(el('span', { class: p.cls || '' }, [p.text]));
  });
  return out;
}

function renderCard(item) {
  const isSlide = item.type === 'slide';
  const attrs = {
    class: `library-card library-card--${item.type}`,
    href: item.url,
    dataset: {
      type: item.type,
      ext: item.ext || '',
      cat: item.catClass || item.category || '',
    },
  };
  if (isSlide) {
    attrs.target = '_blank';
    attrs.rel = 'noopener';
  } else {
    attrs.download = item.name;
  }

  return el('a', attrs, [
    el('div', { class: 'library-card-icon' }, [iconFor(item)]),
    el('div', { class: 'library-card-body' }, [
      el('div', { class: 'library-card-title' }, [item.title]),
      el('div', { class: 'library-card-meta' }, metaForCard(item)),
    ]),
    el('div', { class: 'library-card-action' }, [isSlide ? '↗' : '↓']),
  ]);
}

export async function renderLibrary() {
  const grid = $('#libraryGrid');
  const meta = $('#libraryMeta');
  const hint = $('#libraryEditHint');
  if (!grid) return;

  if (hint) hint.hidden = !store.isEditing();

  const manifest = await loadManifest();
  const items = manifest.items || [];

  if (meta) {
    if (manifest.error) {
      meta.textContent = `자료 목록을 불러오지 못했습니다 (${manifest.error})`;
    } else if (items.length) {
      const s = manifest.slides ?? items.filter((x) => x.type === 'slide').length;
      const f = manifest.files ?? items.filter((x) => x.type === 'file').length;
      meta.textContent = `총 ${items.length}건 — 발표자료 ${s} · 다운로드 ${f}`;
    } else {
      meta.textContent = '등록된 자료가 없습니다.';
    }
  }

  clear(grid);
  for (const it of items) grid.append(renderCard(it));
}

export function invalidateLibraryCache() {
  cached = null;
}
