/**
 * app.js — rendering + events + detail modal (read-only)
 *
 * 데이터 편집은 저장소의 data/sessions.json 직접 수정.
 * 이 앱은 순수 뷰어 역할만 한다.
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
};

/* =============== Bootstrap =============== */
document.addEventListener('DOMContentLoaded', async () => {
  bindNav();
  bindTopbar();
  bindCalendarControls();
  bindTimelineControls();
  bindModals();
  document.body.dataset.view = ui.view;
  store.subscribe(renderAll);

  // Initial placeholder render (zero state while fetch runs)
  renderAll();

  await store.init();

  const st = store.getState();
  if (st.error) {
    toast('데이터를 불러오지 못했습니다');
  }
});

/* =============== Top-level render =============== */
function renderAll() {
  const st = store.getState();
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
    ? `교육 ${total}회 · 누적 수강 ${attendees.toLocaleString('ko-KR')}명`
    : '';
}

/* =============== Navigation =============== */
function bindNav() {
  $$('.nav-item').forEach((btn) =>
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    })
  );
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
    const items = byDate.get(cell.key) || [];
    const items2 = items.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    const cellEl = el('div', {
      class: `cal-cell ${cell.inMonth ? '' : 'is-other-month'} ${
        cell.key === today ? 'is-today' : ''
      } ${cell.date.getDay() === 0 || cell.date.getDay() === 6 ? 'is-weekend' : ''}`,
      dataset: { dow: String(cell.date.getDay()), date: cell.key },
    });
    const head = el('div', { class: 'cal-day-head' }, [
      el('span', { class: 'cal-day-num' }, [String(cell.date.getDate())]),
    ]);
    cellEl.append(head);

    const events = el('div', { class: 'cal-events' });
    const shown = items2.slice(0, maxPerCell);
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
    if (items2.length > maxPerCell) {
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
          [`+${items2.length - maxPerCell}건 더보기`]
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
    for (const s of rows) {
      if (
        !todayDividerInserted &&
        s.date < today &&
        rows.indexOf(s) === rows.findIndex((r) => r.date < today)
      ) {
        body.append(el('div', { class: 'timeline-divider' }));
        todayDividerInserted = true;
      }
      body.append(renderTimelineItem(s));
    }
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
    if (e.key === 'Escape') closeModal('detail');
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

  const body = $('#detailBody');
  clear(body);

  body.append(
    el(
      'div',
      {
        style:
          'display:flex; align-items:center; gap:8px; margin-bottom:14px; flex-wrap:wrap;',
      },
      [
        el('span', { class: 'status-pill', dataset: { status: s.status } }, [
          STATUS_LABEL[s.status],
        ]),
        el('span', { class: 'panel-sub' }, [formatDateKo(s.date)]),
        s.startTime
          ? el('span', { class: 'panel-sub' }, [`· ${formatTimeRange(s.startTime, s.endTime)}`])
          : null,
        relativeKo(s.date)
          ? el('span', { class: 'hero-countdown' }, [relativeKo(s.date)])
          : null,
      ]
    )
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

/* =============== Toast =============== */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-show'), 2200);
}
