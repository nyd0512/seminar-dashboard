/**
 * data.js — constants only
 *
 * 교육 데이터는 data/sessions.json 이 정본이다.
 * 편집은 GitHub 저장소의 sessions.json 을 직접 수정 → 커밋 → Pages 재배포 흐름.
 */

export const DATA_URL = './data/sessions.json';

export const STATUS_LABEL = {
  scheduled: '예정',
  ongoing: '진행중',
  completed: '완료',
};

/**
 * @typedef {'scheduled'|'ongoing'|'completed'} SessionStatus
 * @typedef {{
 *   id: string,
 *   title: string,
 *   topic?: string,
 *   date: string,              // YYYY-MM-DD
 *   startTime?: string,        // HH:MM
 *   endTime?: string,
 *   isOnline: boolean,
 *   location?: string,
 *   instructor: string,
 *   audience: string,
 *   enrolled: number,
 *   capacity: number,
 *   status: SessionStatus,
 *   description?: string
 * }} Session
 */
