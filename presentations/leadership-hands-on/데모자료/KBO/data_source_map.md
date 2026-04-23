# KBO 데이터 소스 맵

**작성일**: 2026년 4월 13일  
**용도**: 사무 데모용 KBO 데이터 수집 가이드

---

## 1. 데이터 소스 URL 및 접근성

| 소스 | URL | 접근 가능 여부 | 방법 | 데이터 품질 |
|:-----|:----|:-------------|:-----|:-----------|
| KBO 공식 — 팀 순위 | koreabaseball.com/Record/TeamRank/TeamRank.aspx | 직접 접근 가능 | 브라우저 (JS 렌더링) | 최고 |
| KBO 공식 — 타자 기록 | koreabaseball.com/Record/Player/HitterBasic/Basic1.aspx | 직접 접근 가능 | 브라우저 (JS 렌더링) | 최고 |
| KBO 공식 — 투수 기록 | koreabaseball.com/Record/Player/PitcherBasic/Basic1.aspx | 직접 접근 가능 | 브라우저 (JS 렌더링) | 최고 |
| KBO 공식 — 관중 현황 | koreabaseball.com/Record/Crowd/History.aspx | **WebFetch 추출 성공** | 직접 접근 | 최고 |
| Statiz | statiz.sporki.com | **접근 불가** (DNS 오류) | — | — |
| statiz.co.kr | www.statiz.co.kr | 확인 불가 | 브라우저 | 높음 |
| 한국 Wikipedia | ko.wikipedia.org/wiki/2024년_KBO_리그 | **WebFetch 추출 성공** | 직접 접근 | 보통 |
| 영문 Wikipedia | en.wikipedia.org/wiki/2024_KBO_League_season | **WebFetch 추출 성공** | 직접 접근 | 높음 |
| 영문 Wikipedia | en.wikipedia.org/wiki/2025_KBO_League_season | **WebFetch 추출 성공** | 직접 접근 | 높음 |
| Daum Sports | sports.daum.net/record/kbo | 접근 가능 (JS 렌더링) | 브라우저 | 높음 |
| KBReport | kbreport.com | 연결 오류 | — | — |
| TVING KBO | tving.com/sports/kbo/history | 접근 가능 | 브라우저 | 높음 |
| news1.kr (시상식) | news1.kr/sports/baseball/5611942 | **WebFetch 추출 성공** | 직접 접근 | 높음 |

---

## 2. 수집 완료 데이터 요약

| 파일명 | 내용 | 출처 | 신뢰도 |
|:-------|:-----|:-----|:-------|
| team_standings_2024.md | 2024 정규시즌 10개팀 전체 순위 (승/패/무/승률/게임차) | Wikipedia (영문/한국) | 높음 |
| team_standings_2025.md | 2025 정규시즌 10개팀 전체 순위 (승/패/무/승률/게임차) | Wikipedia (영문) | 높음 |
| top_batters_2024.md | 2024 주요 타자 수상 기록 (에레디아, 김도영, 딘, 레이예스, 홍창기 등) | KBO 시상식 공식, 스포츠 기사 | 높음 |
| top_pitchers_2024.md | 2024 주요 투수 수상 기록 (네일, 곽빈, 원태인, 하트, 정해영) | KBO 시상식 공식 | 높음 |
| postseason_2024.md | 2024 포스트시즌 전 라운드 결과 + 전체 시상식 수상자 | Wikipedia, news1.kr | 높음 |
| attendance_5y.md | 연도별 총 관중수/평균 관중수 (2015~2024, 10년치) | KBO 공식 역대 관중 현황 | 최고 |

---

## 3. 수집 실패 / 확인 불가 데이터

| 데이터 | 이유 | 대안 |
|:-------|:-----|:-----|
| 타자 개인 기록 TOP 20 전체 | JS 동적 렌더링으로 WebFetch 추출 불가 | 브라우저 직접 접근, Selenium/Playwright |
| 투수 개인 기록 TOP 20 전체 | JS 동적 렌더링으로 WebFetch 추출 불가 | 브라우저 직접 접근, Selenium/Playwright |
| 한국시리즈 경기별 스코어 | 출처에서 미제공 | KBO 공식 사이트 경기결과 메뉴 |
| 2025 개인 기록 | 시즌 진행 중 (2025년 완료) | Wikipedia 2025 시즌 문서 추후 확인 |
| 구단별 관중수 세부 | 연도별 총합만 확인 | KBO 공식 구단별 관중 현황 페이지 |

---

## 4. 데모용 추천 분석 시나리오

| 분석 제목 | 필요 데이터 | 예상 인사이트 |
|:---------|:-----------|:------------|
| **팀 성적과 관중 상관관계** | 팀 순위 + 연도별 관중 추이 | 강팀(KIA 2024)이 있을 때 관중 급증? |
| **코로나 V자 회복 분석** | 2018~2024 관중 추이 | 2020~2021 저점 → 2024 역대 최다 회복 스토리 |
| **외국인 선수 기여도** | 수상자 국적 비율 분석 | 2024 주요 부문 수상자 절반이 외국인 |
| **두 시즌 팀 순위 변동** | 2024 vs 2025 팀 순위 | KIA 1위→8위, 한화 8위→2위 역전 |
| **리그 경쟁력 분석** | 승률 분포, 게임차 변화 | 2024 5~6위 승률 동일(.507) — 치열한 경쟁 |
| **역대 최다 관중 달성 스토리** | 2015~2024 관중 + 주요 사건 | 10년간 KBO 성장 스토리텔링 |

---

## 5. 데이터 수집 기술 요약

| 방법 | 성공 여부 | 적용 사례 |
|:-----|:---------|:---------|
| WebFetch (정적 HTML) | 성공 | Wikipedia, KBO 관중 현황, 뉴스 기사 |
| WebFetch (JS 렌더링) | 실패 | KBO 기록실, Daum Sports (동적 테이블) |
| WebSearch | 성공 (URL 수집) | 소스 파악, 일부 수치 확인 |
| Statiz 직접 접근 | 실패 (DNS 오류) | statiz.sporki.com 도메인 불가 |

