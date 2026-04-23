# Data Manifest

자동 생성된 스키마 세부 (schema_report.txt 요약). JSON 버전: `data_manifest.json`.

## 요약

| 카테고리 | 파일 | Rows | Cols | 연도 범위 |
|---|---|---:|---:|---|
| batting | player_hitter_2001_2020.csv | 570 | 37 | 2002–2020 |
| pitching | player_pitcher_2001_2020.csv | 379 | 43 | 2002–2020 |
| fielding | player_defense_2001_2020.csv | 12,934 | 17 | 2002–2020 |
| running | player_runner_2001_2020.csv | 5,817 | 10 | 2002–2020 |
| team | team_hitter_2001_2020.csv | 174 | 26 | 2001–2020 |
| team | team_pitcher_2001_2020.csv | 174 | 32 | 2001–2020 |
| team | team_defense_2001_2020.csv | 174 | 13 | 2001–2020 |
| team | team_runner_2001_2020.csv | 174 | 9 | 2001–2020 |
| team | team_total_2001_2020.csv | 174 | 74 | 2001–2020 |
| team | team_standings_2001_2020.csv | 174 | 8 | 2001–2020 |
| team | team_standings_2021_2025.csv | 50 | 9 | 2021–2025 |
| team | team_standings_2001_2025.csv | 224 | 9 | 2001–2025 |
| postseason | korean_series_1982_2025.csv | 44 | 5 | 1982–2025 |
| attendance | kbo_attendance_1982_2025.csv | 44 | 4 | 1982–2025 |
| team | team_name_mapping.csv | 20 | 4 | — |
| awards | kbo_mvp_1982_2025.csv | 44 | 4 | 1982–2025 |
| awards | kbo_rookie_1983_2025.csv | 43 | 4 | 1983–2025 |
| awards | kbo_golden_glove_1982_2025.csv | 438 | 4 | 1982–2025 |
| **TOTAL** |  | **21,651** |  |  |

## 주요 컬럼 사전

### 타격 (batting/pitching/fielding/running)
- `연도`, `선수명`, `팀명` (공통)
- 타격: `AVG`(타율), `OPS`, `HR`(홈런), `RBI`(타점), `SB`(도루), `PA`(타석), `AB`(타수), `WHIP`은 투수에
- 투수: `ERA`, `WHIP`, `W/L/SV/HLD`, `IP`(이닝), `K/BB`, `QS`, `WPCT`
- 수비: `POS`(포지션), `E`(실책), `FPCT`(수비율), `PB`(포일), `CS%`(도루저지율)
- 주루: `SBA`(도루시도), `SB`(성공), `CS`(실패), `SB%`(성공률)

### 팀 (team)
- `연도`/`year`, `팀명`/`team`
- `Team_Total`: 타격+투수+수비+주루 **74개 컬럼 통합** — 원핫 조인 불필요
- `team_standings_2001_2025.csv`: `year,rank,team,G,W,L,D,WPCT,GB` — 정규시즌 최종 순위, 25시즌 (2021-25는 10팀, 2001-12는 8팀)

### 포스트시즌
- `year,champion,runner_up,series_result,mvp` — 한국시리즈 결과 44년
- `series_result` 예: `4-2` (풀시리즈), `4-0-(1)` (무승부 1회 포함)
- 1985년 Samsung Lions 통합우승으로 한국시리즈 없음 (`No Series`)

### 관중
- `year,total_attendance,avg_per_game,number_of_games`
- 2020년 COVID-19 무관중 → `total_attendance=328,317` (파행 시즌)
- 2021년 제한적 입장 → `1,228,489`
- 2024년 첫 1천만 관중 돌파 `10,887,705`
- 2025년 역대 최고 `12,312,519`

## 알려진 결측/주의

- 2021-2025 선수·팀 세부 스탯은 **없음** — 원본 크롤러가 2020까지만 커밋됨. 순위(standings)만 Wikipedia로 보강.
- `team_standings_2001_2025.csv` 의 `GB`(게임차) 컬럼: 2001-2020 구간은 `null` (원본에 없어서 도출 생략)
- 팀명은 2001-2020 구간은 한글(`두산/삼성/...`), 2021-2025 구간은 영문(`Doosan Bears/...`). 통합 분석 시 매핑 필요 — README에 팀명 사전 참조.

## 재수집 스크립트

`_sources/KBO-Record-Crawler/` 에 원본 Python 크롤러 보관. ChromeDriver 설치 후 `python Player_Total.py` 재실행하면 최신 시즌까지 갱신 가능 (KBO 공식 사이트 ToS 준수 필요).
