/**
 * index.js — Express app: serves the static frontend and the /api/* JSON routes.
 *
 * Auth model: read is public; create/update/delete require header
 *   X-Edit-Password: <password>
 * Password defaults to 'aijjang' and can be overridden via env EDIT_PASSWORD.
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';

import { createStore } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SESSIONS_JSON = path.join(ROOT, 'data', 'sessions.json');
const PORT = Number(process.env.PORT) || 3000;
const PASSWORD = process.env.EDIT_PASSWORD || 'aijjang';
const PW_BUF = Buffer.from(PASSWORD, 'utf8');

const sessions = await createStore(SESSIONS_JSON);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

/* ---- auth ---- */
// Constant-time compare with length masked behind a fixed-size scratch buffer.
// `timingSafeEqual` requires equal lengths; copying both inputs into the same
// fixed buffer keeps the comparison time independent of the provided length.
function checkPassword(provided) {
  if (typeof provided !== 'string' || provided.length === 0) return false;
  const size = Math.max(PW_BUF.length, 64);
  const a = Buffer.alloc(size);
  const b = Buffer.alloc(size);
  Buffer.from(provided, 'utf8').copy(a);
  PW_BUF.copy(b);
  return timingSafeEqual(a, b) && provided.length === PASSWORD.length;
}

function requireEdit(req, res, next) {
  if (!checkPassword(req.get('X-Edit-Password') || ''))
    return res.status(401).json({ error: 'invalid password' });
  next();
}

/* ---- API ---- */
app.post('/api/auth', (req, res) => {
  const ok = checkPassword(req.body?.password || '');
  res.status(ok ? 200 : 401).json({ ok });
});

app.get('/api/sessions', (_req, res) => {
  res.json(sessions.list());
});

app.get('/api/sessions/:id', (req, res, next) => {
  try {
    const row = sessions.get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  } catch (e) { next(e); }
});

app.post('/api/sessions', requireEdit, async (req, res, next) => {
  try { res.status(201).json(await sessions.create(req.body || {})); }
  catch (e) { next(e); }
});

app.put('/api/sessions/:id', requireEdit, async (req, res, next) => {
  try { res.json(await sessions.update(req.params.id, req.body || {})); }
  catch (e) { next(e); }
});

app.delete('/api/sessions/:id', requireEdit, async (req, res, next) => {
  try { res.json(await sessions.remove(req.params.id)); }
  catch (e) { next(e); }
});

/* ---- static frontend ---- */
app.use(
  express.static(ROOT, {
    extensions: ['html'],
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-store');
    },
  })
);

/* ---- error handler ---- */
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[err]', err);
  res.status(status).json({ error: err.message || 'internal error' });
});

app.listen(PORT, () => {
  console.log(`[lecture-dashboard] listening on http://localhost:${PORT}`);
  console.log(`[lecture-dashboard] data: ${SESSIONS_JSON}`);
});
