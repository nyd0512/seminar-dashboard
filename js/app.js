/**
 * app.js — rendering + events + detail/password/form modals.
 *
 * 읽기는 누구나, 편집은 서버에 보관된 비밀번호로 잠금 해제한 뒤 수행.
 */

import { store } from './store.js';
import { STATUS_LABEL } from './data.js';
import {
  el,
  $,
  $$,
  clear,
  debounce,
  parseDate,
  todayKey,
  monthCells,
  addMonths,
  formatMonth,
  formatDateKo,
  formatTimeRange,
  relativeKo,
} from './utils.js';

/* =============== Global UI state =============== */
const ui = {
  view: 'cover', // cover | calendar | timeline
  calCursor: new Date(),
  calFilter: 'all',
  tlFilter: 'all',
  search: '',
  openSessionId: null,
  editingId: null, // null = create new, string = edit existing
};

/* =============== Bootstrap =============== */
document.addEventListener('DOMContentLoaded', async () => {
  bindNav();
  bindTopbar();
  bindCalendarControls();
  bindTimelineControls();
  bindModals();
  bindLock();
  bindPasswordForm();
  bindSessionForm();
  document.body.dataset.view = ui.view;
  store.subscribe(renderAll);

  renderAll();

  await store.init();

  if (store.getState().error) toast('데이터를 불러오지 못했습니다');
});

/* =============== Top-level render =============== */
function renderAll() {
  const st = store.getState();
  document.body.dataset.editMode = store.isEditing() ? '1' : '0';
  syncLock();
  renderTally(st);
  if (ui.view === 'calendar') renderCalendar(st);
  if (ui.view === 'timeline') renderTimeline(st);
  if (ui.openSessionId) {
    const s = store.getById(ui.openSessionId);
    if (s) renderDetail(s);
    else closeModal('detail');
  }
}

/* =============== Topbar tally (누적) =============== */
function renderTally({ sessions }) {
  const tally = $('#pageTally');
  if (!tally) return;
  const total = sessions.length;
  const attendees = sessions.reduce((a, s) => a + (s.enrolled || 0), 0);
  tally.textContent = total
    ? `교육 ${total}회 · 누적 수강 ${attendees.toLocaleString('ko-KR')}명 (동일인 누적 포함)`
    : '';
}

/* =============== Navigation =============== */
function bindNav() {
  $$('.nav-item').forEach((btn) =>
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    })
  );
  $('.sidebar-brand')?.addEventListener('click', () => switchView('cover'));
}

function switchView(view) {
  ui.view = view;
  document.body.dataset.view = view;
  $$('.nav-item').forEach((n) => n.classList.toggle('is-active', n.dataset.view === view));
  $$('.view').forEach((v) =>
    v.classList.toggle('is-active', v.dataset.viewContent === view)
  );
  const titles = {
    cover: ['대문', 'AI 전파교육 소개'],
    calendar: ['캘린더', '월간 교육 일정'],
    timeline: ['타임라인', '과거 · 예정 교육 목록'],
  };
  const [t, sub] = titles[view];
  $('#pageTitle').textContent = t;
  $('#pageSub').textContent = sub;
  renderAll();
}

/* =============== Topbar: search =============== */
function bindTopbar() {
  const searchInput = $('#searchInput');
  searchInput.addEventListener(
    'input',
    debounce((e) => {
      ui.search = e.target.value.trim().toLowerCase();
      renderAll();
    }, 180)
  );
}

/* =============== Calendar view =============== */
function bindCalendarControls() {
  $('#calPrev').addEventListener('click', () => {
    ui.calCursor = addMonths(ui.calCursor, -1);
    renderCalendar(store.getState());
  });
  $('#calNext').addEventListener('click', () => {
    ui.calCursor = addMonths(ui.calCursor, 1);
    renderCalendar(store.getState());
  });
  $('#calToday').addEventListener('click', () => {
    ui.calCursor = new Date();
    renderCalendar(store.getState());
  });
  $$('.calendar-bar [data-filter]').forEach((btn) =>
    btn.addEventListener('click', () => {
      ui.calFilter = btn.dataset.filter;
      $$('.calendar-bar [data-filter]').forEach((b) =>
        b.classList.toggle('is-active', b === btn)
      );
      renderCalendar(store.getState());
    })
  );
}

function matchesSearch(s) {
  if (!ui.search) return true;
  const t = `${s.title} ${s.topic} ${s.instructor} ${s.audience} ${s.location}`.toLowerCase();
  return t.includes(ui.search);
}

function renderCalendar({ sessions }) {
  const cursor = ui.calCursor;
  const grid = $('#calendarGrid');
  $('#calLabel').textContent = formatMonth(cursor);

  const cells = monthCells(cursor.getFullYear(), cursor.getMonth());
  const today = todayKey();

  const byDate = new Map();
  for (const s of sessions) {
    if (ui.calFilter !== 'all' && s.status !== ui.calFilter) continue;
    if (!matchesSearch(s)) continue;
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date).push(s);
  }

  clear(grid);
  const maxPerCell = 3;

  for (const cell of cells) {
    const items = (byDate.get(cell.key) || []).sort((a, b) =>
      (a.startTime || '').localeCompare(b.startTime || '')
    );
    const cellEl = el('div', {
      class: `cal-cell ${cell.inMonth ? '' : 'is-other-month'} ${
        cell.key === today ? 'is-today' : ''
      } ${cell.date.getDay() === 0 || cell.date.getDay() === 6 ? 'is-weekend' : ''}`,
      dataset: { dow: String(cell.date.getDay()), date: cell.key },
    });
    const head = el('div', { class: 'cal-day-head' }, [
      el('span', { class: 'cal-day-num' }, [String(cell.date.getDate())]),
      store.isEditing()
        ? el(
            'button',
            {
              class: 'cal-add-btn',
              type: 'button',
              'aria-label': `${cell.key} 새 교육 추가`,
              title: '새 교육 추가',
              on: {
                click: (e) => {
                  e.stopPropagation();
                  openForm(null, { date: cell.key });
                },
              },
            },
            ['+']
          )
        : null,
    ]);
    cellEl.append(head);

    const events = el('div', { class: 'cal-events' });
    const shown = items.slice(0, maxPerCell);
    for (const s of shown) {
      events.append(
        el(
          'button',
          {
            class: 'cal-event',
            type: 'button',
            dataset: { status: s.status, id: s.id },
            title: `${s.title}${s.startTime ? ' · ' + s.startTime : ''}`,
            on: { click: () => openDetail(s.id) },
          },
          [
            s.startTime ? el('span', { class: 'cal-event-time' }, [s.startTime]) : null,
            el('span', { class: 'cal-event-title' }, [s.title]),
          ]
        )
      );
    }
    if (items.length > maxPerCell) {
      events.append(
        el(
          'button',
          {
            class: 'cal-more',
            type: 'button',
            on: {
              click: () => {
                ui.view = 'timeline';
                ui.tlFilter = 'all';
                ui.search = '';
                $('#searchInput').value = '';
                switchView('timeline');
                setTimeout(() => {
                  const target = document.querySelector(
                    `.timeline [data-date="${cell.key}"]`
                  );
                  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 50);
              },
            },
          },
          [`+${items.length - maxPerCell}건 더보기`]
        )
      );
    }
    cellEl.append(events);
    grid.append(cellEl);
  }
}

/* =============== Timeline view =============== */
function bindTimelineControls() {
  $$('.timeline-bar [data-tl-filter]').forEach((btn) =>
    btn.addEventListener('click', () => {
      ui.tlFilter = btn.dataset.tlFilter;
      $$('.timeline-bar [data-tl-filter]').forEach((b) =>
        b.classList.toggle('is-active', b === btn)
      );
      renderTimeline(store.getState());
    })
  );
}

function renderTimeline({ sessions }) {
  const list = $('#timelineList');
  clear(list);
  const today = todayKey();

  let filtered = sessions.filter(matchesSearch);
  if (ui.tlFilter === 'upcoming') {
    filtered = filtered.filter((s) => s.status !== 'completed');
  } else if (ui.tlFilter === 'past') {
    filtered = filtered.filter((s) => s.status === 'completed');
  }

  filtered.sort((a, b) => b.date.localeCompare(a.date));
  const grouped = new Map();
  for (const s of filtered) {
    const key = s.date.slice(0, 7);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(s);
  }

  $('#timelineCount').textContent = `총 ${filtered.length}건`;

  if (store.isEditing()) {
    list.append(
      el(
        'button',
        {
          class: 'btn btn-primary timeline-add',
          type: 'button',
          on: { click: () => openForm() },
        },
        ['+ 새 교육 추가']
      )
    );
  }

  if (!filtered.length) {
    list.append(el('div', { class: 'empty' }, ['표시할 교육이 없습니다.']));
    return;
  }

  let todayDividerInserted = false;
  for (const [monthKey, rows] of grouped) {
    const [y, m] = monthKey.split('-');
    const month = el('div', { class: 'timeline-month' });
    const head = el('div', { class: 'timeline-month-head' }, [
      el('div', { class: 'timeline-month-title' }, [`${y}년 ${Number(m)}월`]),
      el('div', { class: 'timeline-month-count' }, [`${rows.length}건`]),
    ]);
    month.append(head);
    const body = el('div', { class: 'data-list' });
    const firstPastIdx = todayDividerInserted
      ? -1
      : rows.findIndex((r) => r.date < today);
    rows.forEach((s, i) => {
      if (i === firstPastIdx) {
        body.append(el('div', { class: 'timeline-divider' }));
        todayDividerInserted = true;
      }
      body.append(renderTimelineItem(s));
    });
    month.append(body);
    list.append(month);
  }
}

function renderTimelineItem(s) {
  const d = parseDate(s.date);
  const rel = relativeKo(s.date);
  return el(
    'div',
    {
      class: 'data-list-item',
      dataset: { date: s.date, id: s.id },
      on: { click: () => openDetail(s.id) },
    },
    [
      el('div', { class: 'data-list-date' }, [
        el('span', { class: 'data-list-date-mon' }, [`${d.getMonth() + 1}월`]),
        el('span', { class: 'data-list-date-day' }, [String(d.getDate())]),
      ]),
      el('div', { class: 'data-list-body' }, [
        el('div', { class: 'data-list-title' }, [s.title]),
        el('div', { class: 'data-list-meta' }, [
          s.startTime ? el('span', {}, [formatTimeRange(s.startTime, s.endTime)]) : null,
          s.startTime ? el('span', { class: 'dot' }) : null,
          el('span', {}, [s.isOnline ? '온라인' : s.location || '오프라인']),
          s.instructor ? el('span', { class: 'dot' }) : null,
          s.instructor ? el('span', {}, [`강사 ${s.instructor}`]) : null,
          s.audience ? el('span', { class: 'dot' }) : null,
          s.audience ? el('span', {}, [s.audience]) : null,
        ]),
      ]),
      el('div', { class: 'data-list-right' }, [
        s.capacity > 0 ? renderCapacity(s) : null,
        rel ? el('span', { class: 'relative-tag' }, [rel]) : null,
        el('span', { class: 'status-pill', dataset: { status: s.status } }, [
          STATUS_LABEL[s.status],
        ]),
      ]),
    ]
  );
}

function renderCapacity(s) {
  const pct = s.capacity ? Math.min(100, Math.round((s.enrolled / s.capacity) * 100)) : 0;
  const full = s.enrolled >= s.capacity && s.capacity > 0;
  return el('div', { class: 'capacity' }, [
    el('span', { class: 'mono' }, [`${s.enrolled}/${s.capacity}`]),
    el('div', { class: 'capacity-bar' }, [
      el('div', {
        class: `capacity-bar-fill ${full ? 'is-full' : ''}`,
        style: `width:${pct}%`,
      }),
    ]),
  ]);
}

/* =============== Modals =============== */
function bindModals() {
  document.addEventListener('click', (e) => {
    const cl = e.target.getAttribute?.('data-close');
    if (cl) closeModal(cl);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = document.querySelector('.modal.is-open');
    if (open) closeModal(open.id.replace(/Modal$/, ''));
  });
}

function openModal(name) {
  const m = $(`#${name}Modal`);
  if (!m) return;
  m.classList.add('is-open');
  m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(name) {
  const m = $(`#${name}Modal`);
  if (!m) return;
  m.classList.remove('is-open');
  m.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (name === 'detail') ui.openSessionId = null;
}

/* =============== Detail modal =============== */
function openDetail(id) {
  const s = store.getById(id);
  if (!s) return;
  ui.openSessionId = id;
  renderDetail(s);
  openModal('detail');
}

function renderDetail(s) {
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

  const info = el('div', { class: 'info-grid' }, [
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
  ]);
  body.append(info);

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
  // Keep the close button (last child); rebuild edit/delete in front of it.
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

/* =============== Lock toggle =============== */
function bindLock() {
  $('#lockBtn').addEventListener('click', () => {
    if (store.isEditing()) {
      store.lockEditing();
      toast('편집 잠금');
    } else {
      openPasswordModal();
    }
  });
}

function syncLock() {
  const btn = $('#lockBtn');
  const label = $('#lockLabel');
  if (!btn || !label) return;
  const editing = store.isEditing();
  btn.classList.toggle('is-unlocked', editing);
  btn.setAttribute('aria-pressed', editing ? 'true' : 'false');
  btn.setAttribute(
    'aria-label',
    editing ? '편집 모드 잠금' : '편집 모드 잠금 해제'
  );
  label.textContent = editing ? '편집 중' : '편집 잠금';
}

/* =============== Password modal =============== */
function openPasswordModal() {
  const input = $('#passwordInput');
  input.value = '';
  $('#passwordHint').textContent = '현재 세션에만 유효합니다.';
  $('#passwordHint').classList.remove('is-error');
  openModal('password');
  setTimeout(() => input.focus(), 30);
}

function bindPasswordForm() {
  const form = $('#passwordForm');
  form.addEventListener('submit', (e) => {
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
function openForm(id = null, { date } = {}) {
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

  setFormValues(
    form,
    existing || { status: 'scheduled', date: date || todayKey() }
  );

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

function bindSessionForm() {
  const form = $('#sessionForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = $('#formSubmit');
    submitBtn.disabled = true;
    try {
      const payload = readForm(form);
      if (!payload.title) {
        toast('제목을 입력해 주세요');
        return;
      }
      if (!payload.date) {
        toast('날짜를 입력해 주세요');
        return;
      }
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

/* =============== Toast =============== */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-show'), 2200);
}
