/**
 * library.js — 자료실(열람실) 뷰.
 *
 * presentations/files/manifest.json 을 fetch 해서 카드 그리드로 렌더.
 * manifest 는 deploy 시 scripts/build-materials-manifest.mjs (predeploy hook) 로 자동 생성.
 * 사용자는 파일만 presentations/files/ 에 넣고 deploy 하면 자동으로 반영된다.
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
  html: '🌐',
};

function iconFor(ext) {
  return EXT_ICON[ext] || '📁';
}

function fmtSize(bytes) {
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

export async function renderLibrary() {
  const grid = $('#libraryGrid');
  const meta = $('#libraryMeta');
  const hint = $('#libraryEditHint');
  if (!grid) return;

  if (hint) hint.hidden = !store.isEditing();

  const manifest = await loadManifest();
  const items = manifest.items || [];

  if (meta) {
    meta.textContent = manifest.error
      ? `자료 목록을 불러오지 못했습니다 (${manifest.error})`
      : items.length
      ? `총 ${items.length}건`
      : '등록된 자료가 없습니다.';
  }

  clear(grid);
  if (!items.length) return;

  for (const it of items) {
    grid.append(
      el(
        'a',
        {
          class: 'library-card',
          href: it.url,
          download: it.name,
          dataset: { ext: it.ext, category: it.category },
        },
        [
          el('div', { class: 'library-card-icon' }, [iconFor(it.ext)]),
          el('div', { class: 'library-card-body' }, [
            el('div', { class: 'library-card-title' }, [it.title]),
            el('div', { class: 'library-card-meta' }, [
              el('span', { class: 'library-card-cat' }, [it.category || '기타']),
              el('span', { class: 'dot' }),
              el('span', {}, [it.ext.toUpperCase()]),
              el('span', { class: 'dot' }),
              el('span', {}, [fmtSize(it.size)]),
              it.date ? el('span', { class: 'dot' }) : null,
              it.date ? el('span', {}, [fmtDate(it.date)]) : null,
            ]),
          ]),
          el('div', { class: 'library-card-action' }, ['↓']),
        ]
      )
    );
  }
}

export function invalidateLibraryCache() {
  cached = null;
}
