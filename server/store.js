/**
 * store.js — JSON-file backed session store with atomic writes.
 *
 * data/sessions.json is the source of truth (and the file git tracks).
 * Writes are serialized via a promise chain and committed via tmp-file rename
 * so a crash mid-write cannot corrupt the canonical file.
 */

import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { normalize, compareSessions } from '../js/schema.js';

export async function createStore(jsonPath) {
  await mkdir(path.dirname(jsonPath), { recursive: true });

  let cache = await load();
  let writeChain = Promise.resolve();

  async function load() {
    let raw;
    try {
      raw = await readFile(jsonPath, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') return [];
      throw e;
    }
    const trimmed = raw.trim();
    if (!trimmed) return [];
    const parsed = JSON.parse(trimmed);
    const arr = Array.isArray(parsed) ? parsed : parsed.sessions;
    return Array.isArray(arr) ? arr.map(normalize) : [];
  }

  function persist() {
    const snapshot = cache.slice().sort(compareSessions);
    writeChain = writeChain.then(async () => {
      const tmp = jsonPath + '.tmp';
      await writeFile(tmp, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
      await rename(tmp, jsonPath);
    });
    return writeChain;
  }

  function nextId() {
    let max = 0;
    for (const s of cache) {
      const m = /^s(\d+)$/.exec(s.id);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return 's' + String(max + 1).padStart(2, '0');
  }

  return {
    list: () => cache.slice().sort(compareSessions),
    get: (id) => cache.find((s) => s.id === id) || null,

    async create(input) {
      const row = normalize({ ...input, id: input.id || nextId() });
      validate(row);
      if (cache.some((s) => s.id === row.id))
        throw httpError(409, `id ${row.id} already exists`);
      cache.push(row);
      await persist();
      return row;
    },

    async update(id, input) {
      const idx = cache.findIndex((s) => s.id === id);
      if (idx < 0) throw httpError(404, 'not found');
      const merged = normalize({ ...cache[idx], ...input, id });
      validate(merged);
      cache[idx] = merged;
      await persist();
      return merged;
    },

    async remove(id) {
      const idx = cache.findIndex((s) => s.id === id);
      if (idx < 0) throw httpError(404, 'not found');
      cache.splice(idx, 1);
      await persist();
      return { id, deleted: true };
    },
  };
}

function validate(row) {
  if (!row.title) throw httpError(400, 'title is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date))
    throw httpError(400, 'date must be YYYY-MM-DD');
  for (const k of ['startTime', 'endTime']) {
    if (row[k] && !/^\d{2}:\d{2}$/.test(row[k]))
      throw httpError(400, `${k} must be HH:MM`);
  }
}

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
