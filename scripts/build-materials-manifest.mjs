/**
 * build-materials-manifest.mjs — 자료실 manifest 빌드 (predeploy hook).
 *
 * 두 종류를 한 manifest 에 합쳐서 열람실 카드로 표시한다.
 *   1) 발표자료 슬라이드 (type=slide) — presentations/index.html 에서 자동 추출
 *   2) 다운로드 파일       (type=file)  — presentations/files/ 디렉토리 스캔
 *
 * 사용자가 할 일:
 *   - 슬라이드 추가: presentations/[slug]/index.html 만들고
 *                   presentations/index.html 의 nav 에 카드 한 줄 추가.
 *   - 파일 추가:     presentations/files/ 폴더에 파일만 넣는다.
 *   - 그 뒤 `firebase deploy --only hosting` — manifest.json 자동 생성.
 *
 * 파일명 규칙 (선택):
 *   YYYY-MM-DD__카테고리__제목.확장자
 *   예) 2026-04-23__슬라이드__AI에이전트_개론.pdf
 */

import { readdir, readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PRES_DIR = join(ROOT, 'presentations');
const FILES_DIR = join(PRES_DIR, 'files');
const INDEX_HTML = join(PRES_DIR, 'index.html');
const MANIFEST = join(FILES_DIR, 'manifest.json');

const NAME_RX = /^(\d{4}-\d{2}-\d{2})__(.+?)__(.+)\.([^.]+)$/;

const CAT_KOR = {
  biz: '비개발',
  dev: '개발',
  lead: '리더',
  team: '팀 내부',
};

/* ---------- (1) 슬라이드: presentations/index.html 파싱 ----------
 * a.item anchor 단위로 먼저 끊은 뒤 안에서 title/sub 추출.
 * lazy regex 가 카드 경계(</a>)를 가로지르지 않게 해서 한 카드 데이터가
 * 다음 카드를 흡수하는 사고를 막음.
 */
async function scanSlides() {
  let html;
  try {
    html = await readFile(INDEX_HTML, 'utf8');
  } catch {
    return [];
  }
  const anchorRx = /<a\s+class="item\s+(\w+)"\s+href="([^"]+)"[\s\S]*?<\/a>/g;
  const titleRx = /<span class="title">([^<]+)<\/span>/;
  const subRx = /<span class="sub">([\s\S]*?)<\/span>/;
  const out = [];
  let m;
  while ((m = anchorRx.exec(html))) {
    const [block, cls, href] = m;
    const tm = titleRx.exec(block);
    const sm = subRx.exec(block);
    if (!tm || !sm) continue;
    const subtitle = sm[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    out.push({
      type: 'slide',
      category: CAT_KOR[cls] || cls,
      catClass: cls,
      title: tm[1].trim(),
      subtitle,
      url: `./presentations/${href.replace(/^\.\//, '')}`,
      ext: 'html',
    });
  }
  return out;
}

/* ---------- (2) 다운로드 파일: presentations/files/ 스캔 ---------- */
function parseFileName(name) {
  const m = NAME_RX.exec(name);
  if (m) {
    const [, date, category, titleRaw, ext] = m;
    return {
      title: titleRaw.replace(/_/g, ' '),
      category,
      date,
      ext: ext.toLowerCase(),
    };
  }
  const ext = extname(name);
  const stem = ext ? name.slice(0, -ext.length) : name;
  return {
    title: stem.replace(/_/g, ' '),
    category: '기타',
    date: null,
    ext: ext.slice(1).toLowerCase(),
  };
}

async function scanFiles() {
  await mkdir(FILES_DIR, { recursive: true });
  const entries = await readdir(FILES_DIR, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (e.name === 'manifest.json' || e.name.startsWith('.')) continue;
    const full = join(FILES_DIR, e.name);
    const st = await stat(full);
    const p = parseFileName(e.name);
    out.push({
      type: 'file',
      name: e.name,
      title: p.title,
      category: p.category,
      date: p.date,
      ext: p.ext,
      size: st.size,
      mtime: st.mtime.toISOString(),
      url: `./presentations/files/${encodeURIComponent(e.name)}`,
    });
  }
  // 날짜(파일명) 또는 수정시간 내림차순 — timestamp 숫자 비교
  const ts = (it) => Date.parse(it.date ? `${it.date}T00:00:00Z` : it.mtime) || 0;
  out.sort((a, b) => ts(b) - ts(a));
  return out;
}

async function build() {
  const slides = await scanSlides();
  const files = await scanFiles();
  // 슬라이드를 상단에 고정 — 발표자료가 먼저 보이게
  const items = [...slides, ...files];

  const out = {
    generatedAt: new Date().toISOString(),
    count: items.length,
    slides: slides.length,
    files: files.length,
    items,
  };
  await writeFile(MANIFEST, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(
    `[materials] manifest: 슬라이드 ${slides.length} + 파일 ${files.length} = 총 ${items.length}`
  );
}

build().catch((e) => {
  console.error('[materials] build failed:', e);
  process.exit(1);
});
