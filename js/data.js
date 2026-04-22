/**
 * data.js — UI-side constants (API endpoints, derived option lists).
 *
 * Record-shape constants (status enum, normalize, sort) live in ./schema.js
 * because they are shared with the Node server.
 */

export { STATUS_LABEL, STATUSES } from './schema.js';
import { STATUS_LABEL } from './schema.js';

export const API_BASE = './api';
export const SESSIONS_URL = `${API_BASE}/sessions`;
export const AUTH_URL = `${API_BASE}/auth`;
export const PASSWORD_HEADER = 'X-Edit-Password';
export const PASSWORD_STORAGE_KEY = 'lecture-dashboard.editpw';

export const STATUS_OPTIONS = Object.entries(STATUS_LABEL).map(
  ([value, label]) => ({ value, label })
);
