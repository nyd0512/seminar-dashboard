/**
 * app.js — rendering + events + detail modal (read-only)
 *
 * 데이터 편집은 저장소의 data/sessions.json 직접 수정.
 * 이 앱은 순수 뷰어 역할만 한다.
 */

import { store } from './store.js';
import { STATUS_LABEL, STATUS_ORDER } from './data.js';
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
  averageRating,
  overallAverage,
  formatRating,
} from './utils.js';

/* =============== Global UI state =============== */
const ui = {
  view: 'cover', // cover | calendar | timeline | stats
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
  bindCover();
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
  renderKPI(st);
  if (ui.view === 'calendar') renderCalendar(st);
  if (ui.view === 'timeline') renderTimeline(st);
  if (ui.view === 'stats') renderStats(st);
  if (ui.openSessionId) {
    const s = store.getById(ui.openSessionId);
    if (s) renderDetail(s);
    else closeModal('detail');
  }
}

/* =============== KPI =============== */
function renderKPI({ sessions }) {
  const now = new Date();
  const totalCount = sessions.length;
  const completedCount = sessions.filter((s) => s.status === 'completed').length;
  const thisMonth = sessions.filter((s) => {
    const d = parseDate(s.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const thisMonthDone = thisMonth.filter((s) => s.status === 'completed').length;
  const thisMonthPlanned = thisMonth.length;
  const totalAttendees = sessions.reduce((a, s) => a + (s.enrolled || 0), 0);
  const avg = overallAverage(sessions);
  const reviewCount = sessions.reduce((a, s) => a + (s.reviews?.length || 0), 0);

  $('#kpiTotal').innerHTML = `<span class="mono">${totalCount}</span><small>건</small>`;
  $('#kpiTotalMeta').textContent = `완료 ${completedCount} · 예정 ${
    totalCount - completedCount
  }`;

  $('#kpiMonth').innerHTML = `<span class="mono">${thisMonthDone}</span><small>/ ${thisMonthPlanned}</small>`;
  $('#kpiMonthMeta').textContent = `${now.getMonth() + 1}월 · 완료 / 전체`;

  $('#kpiAttendees').innerHTML = `<span class="mono">${totalAttendees.toLocaleString('ko-KR')}</span><small>명</small>`;
  $('#kpiAttendeesMeta').textContent = `누적 수강 인원 (수기 집계)`;

  $('#kpiRating').innerHTML = avg
    ? `<span class="mono">${avg.toFixed(1)}</span><small>/ 5.0</small>`
    : '<span class="mono">—</span>';
  $('#kpiRatingMeta').textContent = reviewCount ? `후기 ${reviewCount}건 기준` : '후기 없음';
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
    stats: ['통계', '교육 운영 지표'],
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
        rel ? el('span', { class: 'kpi-meta' }, [rel]) : null,
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

/* =============== Stats view =============== */
function renderStats({ sessions }) {
  renderMonthlyChart(sessions);
  renderStatusChart(sessions);
  renderOrgChart(sessions);
  renderInstructorChart(sessions);
}

function renderMonthlyChart(sessions) {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      date: d,
    });
  }
  const counts = months.map((m) => ({
    ...m,
    count: sessions.filter((s) => s.date.slice(0, 7) === m.key).length,
  }));
  const max = Math.max(1, ...counts.map((c) => c.count));
  const root = $('#monthlyChart');
  clear(root);
  const list = el('div', { class: 'bar-list' });
  for (const c of counts) {
    list.append(
      el('div', { class: 'bar-row' }, [
        el('span', { class: 'bar-label' }, [
          `${c.date.getFullYear()}.${String(c.date.getMonth() + 1).padStart(2, '0')}`,
        ]),
        el('div', { class: 'bar-track' }, [
          el('div', { class: 'bar-fill', style: `width:${(c.count / max) * 100}%` }),
        ]),
        el('span', { class: 'bar-value' }, [String(c.count)]),
      ])
    );
  }
  root.append(list);
}

function renderStatusChart(sessions) {
  const counts = { scheduled: 0, ongoing: 0, completed: 0 };
  sessions.forEach((s) => counts[s.status]++);
  const total = sessions.length || 1;
  const root = $('#statusChart');
  clear(root);
  const list = el('div', { class: 'bar-list' });
  for (const key of STATUS_ORDER) {
    const n = counts[key];
    list.append(
      el('div', { class: 'bar-row' }, [
        el('span', { class: 'bar-label' }, [STATUS_LABEL[key]]),
        el('div', { class: 'bar-track' }, [
          el('div', {
            class: `bar-fill bar-fill--${key}`,
            style: `width:${(n / total) * 100}%`,
          }),
        ]),
        el('span', { class: 'bar-value' }, [String(n)]),
      ])
    );
  }
  root.append(list);
}

function renderOrgChart(sessions) {
  const map = new Map();
  for (const s of sessions) {
    if (!s.audience) continue;
    const orgs = s.audience.split(/[·,]/).map((x) => x.trim()).filter(Boolean);
    for (const o of orgs) {
      map.set(o, (map.get(o) || 0) + (s.enrolled || 0));
    }
  }
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(1, ...rows.map((r) => r[1]));
  const root = $('#orgChart');
  clear(root);
  if (!rows.length) {
    root.append(el('div', { class: 'empty' }, ['데이터 없음']));
    return;
  }
  const list = el('div', { class: 'bar-list' });
  for (const [name, val] of rows) {
    list.append(
      el('div', { class: 'bar-row' }, [
        el('span', { class: 'bar-label', title: name }, [name]),
        el('div', { class: 'bar-track' }, [
          el('div', { class: 'bar-fill', style: `width:${(val / max) * 100}%` }),
        ]),
        el('span', { class: 'bar-value' }, [`${val}명`]),
      ])
    );
  }
  root.append(list);
}

function renderInstructorChart(sessions) {
  const map = new Map();
  for (const s of sessions) {
    if (!s.instructor) continue;
    map.set(s.instructor, (map.get(s.instructor) || 0) + 1);
  }
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const max = Math.max(1, ...rows.map((r) => r[1]));
  const root = $('#instructorChart');
  clear(root);
  if (!rows.length) {
    root.append(el('div', { class: 'empty' }, ['데이터 없음']));
    return;
  }
  const list = el('div', { class: 'bar-list' });
  for (const [name, count] of rows) {
    list.append(
      el('div', { class: 'bar-row' }, [
        el('span', { class: 'bar-label' }, [name]),
        el('div', { class: 'bar-track' }, [
          el('div', { class: 'bar-fill', style: `width:${(count / max) * 100}%` }),
        ]),
        el('span', { class: 'bar-value' }, [`${count}회`]),
      ])
    );
  }
  root.append(list);
}

/* =============== Cover view =============== */
function bindCover() {
  $$('.cover-quick-card').forEach((btn) =>
    btn.addEventListener('click', () => switchView(btn.dataset.viewGoto))
  );
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

  const avg = averageRating(s.reviews);
  const reviewsBlock = el('div', { class: 'reviews-block' }, [
    el('div', { class: 'reviews-block-title' }, [
      '후기',
      el('span', { class: 'panel-sub' }, [
        avg != null ? `평균 ${avg.toFixed(1)} · ${s.reviews.length}건` : '등록된 후기 없음',
      ]),
    ]),
    ...(s.reviews.length
      ? s.reviews.map((r) =>
          el('div', { class: 'review-item' }, [
            el('div', { class: 'review-rating' }, [
              el('span', { class: 'mono' }, [formatRating(r.rating)]),
              el('span', {}, ['/ 5']),
            ]),
            el('div', { class: 'review-comment' }, [r.comment || '(코멘트 없음)']),
          ])
        )
      : []),
  ]);
  body.append(reviewsBlock);
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
