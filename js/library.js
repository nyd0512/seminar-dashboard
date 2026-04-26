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

/* ===== Outline SVG icon set (single-color, currentColor stroke) ===== */
const SVG_ATTR =
  `xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ` +
  `stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`;

const ICONS = {
  document: `<svg ${SVG_ATTR}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>`,
  spreadsheet: `<svg ${SVG_ATTR}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 4v16"/></svg>`,
  slides: `<svg ${SVG_ATTR}><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/></svg>`,
  video: `<svg ${SVG_ATTR}><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m21 8-5 4 5 4z"/></svg>`,
  audio: `<svg ${SVG_ATTR}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  image: `<svg ${SVG_ATTR}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>`,
  archive: `<svg ${SVG_ATTR}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M9 6h3M9 9h3M9 12h3"/></svg>`,
  text: `<svg ${SVG_ATTR}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>`,
  web: `<svg ${SVG_ATTR}><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>`,
  slide: `<svg ${SVG_ATTR}><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M3 9h18M8 21h8M12 17v4"/></svg>`,
  file: `<svg ${SVG_ATTR}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>`,
};

const ACTION_EXTERNAL = `<svg ${SVG_ATTR} stroke-width="1.8"><path d="M7 17 17 7M9 7h8v8"/></svg>`;
const ACTION_DOWNLOAD = `<svg ${SVG_ATTR} stroke-width="1.8"><path d="M12 4v12M6 12l6 6 6-6M5 20h14"/></svg>`;

const EXT_GROUP = {
  pdf: 'document',
  doc: 'document', docx: 'document',
  ppt: 'slides', pptx: 'slides', key: 'slides',
  xls: 'spreadsheet', xlsx: 'spreadsheet', csv: 'spreadsheet', tsv: 'spreadsheet',
  mp4: 'video', mov: 'video', m4v: 'video', webm: 'video', avi: 'video',
  mp3: 'audio', m4a: 'audio', wav: 'audio', flac: 'audio',
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image', svg: 'image',
  zip: 'archive', tar: 'archive', gz: 'archive', '7z': 'archive', rar: 'archive',
  md: 'text', txt: 'text', rtf: 'text',
  html: 'web', htm: 'web',
};

function iconHtmlFor(item) {
  if (item.type === 'slide') return ICONS.slide;
  return ICONS[EXT_GROUP[item.ext]] || ICONS.file;
}

function divWithHtml(className, html) {
  const div = document.createElement('div');
  div.className = className;
  div.innerHTML = html;
  return div;
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
    return cached;
  } catch (e) {
    console.warn('[library] manifest 로드 실패', e);
    // 일시 실패는 캐시하지 않음 — 다음 뷰 진입 시 재시도
    return { items: [], count: 0, error: e.message };
  }
}

function metaForCard(item) {
  const parts = [];
  if (item.category) parts.push({ cls: 'library-card-cat', text: item.category });
  if (item.type === 'slide') {
    if (item.subtitle) parts.push({ text: item.subtitle });
  } else {
    if (item.ext) parts.push({ text: item.ext.toUpperCase() });
    if (item.size != null) parts.push({ text: fmtSize(item.size) });
    const dateStr = item.date || (item.mtime ? item.mtime.slice(0, 10) : '');
    if (dateStr) parts.push({ text: dateStr });
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
    divWithHtml('library-card-icon', iconHtmlFor(item)),
    el('div', { class: 'library-card-body' }, [
      el('div', { class: 'library-card-title' }, [item.title]),
      el('div', { class: 'library-card-meta' }, metaForCard(item)),
    ]),
    divWithHtml('library-card-action', isSlide ? ACTION_EXTERNAL : ACTION_DOWNLOAD),
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
