/**
 * modals.js — Detail / Password / Session form 모달 로직.
 *
 * openModal / closeModal / openPasswordModal / toast 같은 공용 primitive 는
 * app.js 에서 import. ui 공유 state 도 app.js 에서.
 */

import { store } from './store.js';
import { STATUS_LABEL } from './data.js';
import {
  el,
  $,
  clear,
  todayKey,
  formatDateKo,
  formatTimeRange,
  relativeKo,
} from './utils.js';
import {
  ui,
  openModal,
  closeModal,
  openPasswordModal,
  toast,
} from './app.js';

/* =============== Detail modal =============== */
export function openDetail(id) {
  const s = store.getById(id);
  if (!s) return;
  ui.openSessionId = id;
  renderDetail(s);
  openModal('detail');
}

export function renderDetail(s) {
  $('#detailEyebrow').textContent = s.topic || '교육 상세';
  $('#detailTitle').textContent = s.title;

  renderDetailActions(s);

  const body = $('#detailBody');
  clear(body);

  const rel = relativeKo(s.date);
  body.append(
    el('div', { class: 'detail-meta' }, [
      el('span', { class: 'status-pill', dataset: { status: s.status } }, [
        STATUS_LABEL[s.status],
      ]),
      el('span', { class: 'panel-sub' }, [formatDateKo(s.date)]),
      s.startTime
        ? el('span', { class: 'panel-sub' }, [
            `· ${formatTimeRange(s.startTime, s.endTime)}`,
          ])
        : null,
      rel ? el('span', { class: 'hero-countdown' }, [rel]) : null,
    ])
  );

  body.append(
    el('div', { class: 'info-grid' }, [
      infoItem(
        '장소',
        `${s.isOnline ? '온라인' : '오프라인'}${s.location ? ` · ${s.location}` : ''}`
      ),
      infoItem('강사', s.instructor || '—'),
      infoItem('대상 조직', s.audience || '—'),
      infoItem(
        '수강 현황',
        s.capacity
          ? `${s.enrolled}명 / 정원 ${s.capacity}명`
          : s.enrolled
          ? `${s.enrolled}명`
          : '—'
      ),
    ])
  );

  if (s.description) {
    body.append(el('div', { class: 'description-block' }, [s.description]));
  }
}

function infoItem(label, value) {
  return el('div', { class: 'info-item' }, [
    el('div', { class: 'info-label' }, [label]),
    el('div', { class: 'info-value' }, [value]),
  ]);
}

function renderDetailActions(s) {
  const host = $('#detailActions');
  if (!host) return;
  // 닫기 버튼은 유지하고, 그 앞에 편집/삭제 버튼을 다시 만든다.
  const closeBtn = host.querySelector('[data-close="detail"]');
  clear(host);
  if (store.isEditing()) {
    host.append(
      el(
        'button',
        {
          class: 'btn btn-ghost btn-sm',
          type: 'button',
          on: { click: () => openForm(s.id) },
        },
        ['편집']
      ),
      el(
        'button',
        {
          class: 'btn btn-ghost btn-sm btn-danger',
          type: 'button',
          on: { click: () => confirmDelete(s) },
        },
        ['삭제']
      )
    );
  }
  host.append(closeBtn);
}

async function confirmDelete(s) {
  if (!confirm(`"${s.title}" 교육을 삭제할까요? 되돌릴 수 없습니다.`)) return;
  try {
    await store.remove(s.id);
    closeModal('detail');
    toast('삭제되었습니다');
  } catch (e) {
    toast(`삭제 실패: ${e.message}`);
  }
}

/* =============== Password form =============== */
export function bindPasswordForm() {
  $('#passwordForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = $('#passwordInput').value;
    const hint = $('#passwordHint');
    if (!store.unlockEditing(pw)) {
      hint.textContent = '비밀번호가 올바르지 않습니다.';
      hint.classList.add('is-error');
      return;
    }
    closeModal('password');
    toast('편집 잠금 해제');
  });
}

/* =============== Session form (create / edit) =============== */
export function openForm(id = null, { date } = {}) {
  if (!store.isEditing()) {
    openPasswordModal();
    return;
  }
  const isEdit = !!id;
  const existing = isEdit ? store.getById(id) : null;
  if (isEdit && !existing) {
    toast('해당 교육을 찾을 수 없습니다');
    return;
  }

  ui.editingId = id;
  const form = $('#sessionForm');
  form.reset();

  $('#formEyebrow').textContent = isEdit ? '교육 편집' : '교육 추가';
  $('#formTitle').textContent = isEdit ? existing.title : '새 교육';
  $('#formDelete').hidden = !isEdit;

  setFormValues(form, existing || { status: 'scheduled', date: date || todayKey() });

  openModal('form');
  setTimeout(() => form.querySelector('[name="title"]').focus(), 30);
}

function setFormValues(form, s) {
  for (const field of form.elements) {
    if (!field.name) continue;
    const v = s[field.name];
    if (field.type === 'checkbox') field.checked = !!v;
    else field.value = v == null ? '' : v;
  }
}

function readForm(form) {
  const out = {};
  for (const field of form.elements) {
    if (!field.name) continue;
    if (field.type === 'checkbox') out[field.name] = field.checked;
    else if (field.type === 'number')
      out[field.name] = field.value === '' ? 0 : Number(field.value);
    else out[field.name] = field.value.trim();
  }
  return out;
}

export function bindSessionForm() {
  const form = $('#sessionForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = $('#formSubmit');
    submitBtn.disabled = true;
    try {
      const payload = readForm(form);
      if (!payload.title) { toast('제목을 입력해 주세요'); return; }
      if (!payload.date)  { toast('날짜를 입력해 주세요'); return; }
      if (ui.editingId) {
        await store.update(ui.editingId, payload);
        toast('변경 사항을 저장했습니다');
      } else {
        await store.create(payload);
        toast('새 교육을 추가했습니다');
      }
      closeModal('form');
    } catch (err) {
      toast(`저장 실패: ${err.message}`);
    } finally {
      submitBtn.disabled = false;
    }
  });

  $('#formDelete').addEventListener('click', async () => {
    if (!ui.editingId) return;
    const s = store.getById(ui.editingId);
    if (!s) return;
    if (!confirm(`"${s.title}" 교육을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    try {
      await store.remove(ui.editingId);
      closeModal('form');
      closeModal('detail');
      toast('삭제되었습니다');
    } catch (err) {
      toast(`삭제 실패: ${err.message}`);
    }
  });
}
