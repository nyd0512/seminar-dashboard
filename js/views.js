/**
 * views.js — Calendar and Timeline view rendering + event binding.
 *
 * UI state (ui.calCursor, ui.calFilter, ui.tlFilter, ui.search) 는 app.js 에서 export.
 * 세션 단건 클릭 / 추가 동작은 modals.js 의 openDetail / openForm 을 호출.
 */

import { store } from './store.js';
import { STATUS_LABEL } from './data.js';
import {
  el,
  $,
  $$,
  clear,
  parseDate,
  todayKey,
  monthCells,
  addMonths,
  formatMonth,
  formatTimeRange,
  relativeKo,
} from './utils.js';
import { ui, switchView } from './app.js';
import { openDetail, openForm } from './modals.js';

function matchesSearch(s) {
  if (!ui.search) return true;
  const t = `${s.title} ${s.topic} ${s.instructor} ${s.audience} ${s.location}`.toLowerCase();
  return t.includes(ui.search);
}

/* =============== Calendar =============== */
export function bindCalendarControls() {
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

export function renderCalendar({ sessions }) {
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

/* =============== Timeline =============== */
export function bindTimelineControls() {
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

export function renderTimeline({ sessions }) {
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
