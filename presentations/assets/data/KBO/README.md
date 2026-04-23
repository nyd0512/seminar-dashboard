# KBO Demo Dataset

Claude Code로 지식노동(엑셀/대시보드/인사이트 도출) 데모하기 위한 **KBO 리그 공개 데이터셋**.

- **총 레코드**: 21,651 rows / 18 CSV
- **커버리지**: 선수·팀 스탯 2001–2020 (20시즌), 팀 순위 2001–2025 (25시즌), 관중·포스트시즌·MVP·신인왕·골든글러브 1982–2025 (44시즌)
- **인코딩**: UTF-8 (BOM) — Excel에서 바로 열림
- **원본**: GitHub `baseballChatbot7/KBO-Record-Crawler` (KBO 공식 기록실 크롤링) + Wikipedia

## 디렉토리

```
assets/KBO/
├── batting/      player_hitter_2001_2020.csv          (570행, 37개 타격지표)
├── pitching/     player_pitcher_2001_2020.csv         (379행, 43개 투수지표)
├── fielding/     player_defense_2001_2020.csv         (12,934행, 포지션별 수비)
├── running/      player_runner_2001_2020.csv          (5,817행, 도루·주루)
├── team/         team_hitter / team_pitcher /
│                 team_defense / team_runner /
│                 team_total_2001_2020.csv             (각 174행)
│                 team_standings_2001_2025.csv         (224행, 최종 순위)
├── postseason/   korean_series_1982_2025.csv          (44행, 한국시리즈 우승/MVP)
├── attendance/   kbo_attendance_1982_2025.csv         (44행, 연도별 총관중·평균)
├── awards/       kbo_mvp_1982_2025.csv                (44행, 정규시즌 MVP)
│                 kbo_rookie_1983_2025.csv             (43행, 신인왕)
│                 kbo_golden_glove_1982_2025.csv       (438행, 골든글러브 × 포지션)
├── data_manifest.md / data_manifest.json              (스키마 상세)
├── schema_report.txt                                   (자동 생성 검증 리포트)
├── PROGRESS.md                                         (수집 로그)
└── _sources/                                           (원본 clone 캐시 — gitignore 권장)
```

## 데모 아이디어 — Claude Code에게 던질 자연어 지시

### 초간단 (엑셀만)
- "2001-2025 팀별 우승 횟수 집계표 만들어줘"
- "연도별 KBO 총 관중 수 추이를 엑셀 차트로"
- "2024 시즌 타자 상위 10명 OPS 랭킹"

### 중간 (분석 + 인사이트)
- "COVID(2020) 전후 관중 수가 어떻게 회복됐는지 분석"
- "두산 vs LG 10년치 head-to-head 승률 비교"
- "한국시리즈 우승팀의 정규시즌 승률 평균은?"
- "도루 성공률 TOP 투수/포수 조합 찾기 (Player_Runner + Player_Defense)"

### 고난도 (대시보드/리포트)
- "관중-승률 상관관계 대시보드 HTML"
- "각 팀의 25년간 변천사 타임라인 (팀명 변경 포함)"
- "Pythagorean 승률 vs 실제 승률 — 운빨/실력 괴리 큰 시즌 TOP 5"
- "KBO 세대별 홈런왕 흐름 — 10년 단위 비교 리포트"

## 컬럼 네이밍 주의

- 선수 스탯: 한글 컬럼 (`연도/선수명/팀명/AVG/HR/OPS/...`)
- 팀 순위(최신): 영문 컬럼 (`year/rank/team/W/L/WPCT/GB`)
- 포스트시즌·관중: 영문 컬럼

혼용이라 Claude Code에게 작업 시킬 때 "컬럼이 한글인지 영문인지 먼저 확인" 하면 깔끔하게 처리함.

## 라이선스 & 출처

- 선수·팀 스탯 원본: [baseballChatbot7/KBO-Record-Crawler](https://github.com/baseballChatbot7/KBO-Record-Crawler) — 라이선스 명시 없음, KBO 공식 기록실(koreabaseball.com) 스크래핑
- 관중·한국시리즈: [Wikipedia KBO League / Korean Series](https://en.wikipedia.org/wiki/KBO_League) — CC BY-SA
- 2021–2025 팀 순위: Wikipedia 각 시즌 페이지

**교육·시연 용도만.** 재배포는 원본 출처 확인 필수.
