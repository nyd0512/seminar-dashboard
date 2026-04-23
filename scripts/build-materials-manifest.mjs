/**
 * build-materials-manifest.mjs — 자료실 manifest 빌드 (predeploy hook).
 *
 * presentations/files/ 디렉토리를 스캔해서 manifest.json 생성.
 * 사용자는 그냥 파일을 폴더에 넣고 `firebase deploy --only hosting` 만 실행하면
 * 자료실 카드가 자동으로 갱신된다 (코드 수정 0).
 *
 * 파일명 규칙 (선택):
 *   YYYY-MM-DD__카테고리__제목.확장자
 *     예) 2026-04-23__슬라이드__AI에이전트_개론.pdf
 *   ── 카테고리/제목이 없으면 파일명 그대로 사용.
 *
 *   regex: ^(\d{4}-\d{2}-\d{2})__(.+?)__(.+)\.(.+)$
 */

import { readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FILES_DIR = join(ROOT, 'presentations', 'files');
const MANIFEST = join(FILES_DIR, 'manifest.json');

const NAME_RX = /^(\d{4}-\d{2}-\d{2})__(.+?)__(.+)\.([^.]+)$/;

function parse(name) {
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
  return {
    title: name.replace(extname(name), '').replace(/_/g, ' '),
    category: '기타',
    date: null,
    ext: extname(name).slice(1).toLowerCase(),
  };
}

async function build() {
  await mkdir(FILES_DIR, { recursive: true });

  const entries = await readdir(FILES_DIR, { withFileTypes: true });
  const items = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (e.name === 'manifest.json' || e.name.startsWith('.')) continue;
    const full = join(FILES_DIR, e.name);
    const st = await stat(full);
    const parsed = parse(e.name);
    items.push({
      name: e.name,
      title: parsed.title,
      category: parsed.category,
      date: parsed.date,
      ext: parsed.ext,
      size: st.size,
      mtime: st.mtime.toISOString(),
      url: `./files/${e.name}`,
    });
  }
  items.sort((a, b) => {
    const ad = a.date || a.mtime;
    const bd = b.date || b.mtime;
    return bd.localeCompare(ad);
  });

  const out = {
    generatedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
  await writeFile(MANIFEST, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`[materials] manifest with ${items.length} item(s) → ${MANIFEST}`);
}

build().catch((e) => {
  console.error('[materials] build failed:', e);
  process.exit(1);
});
