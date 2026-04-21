# AI 전파교육 대시보드

SW개발팀 내부 **AI 전파교육 진행 현황 게시판**. 지난 교육과 예정된 세션을 한 화면에서 공유하는 정적 사이트.

- **빌드 없음** — Vanilla JS + 정적 HTML/CSS, GitHub Pages가 저장소 루트를 그대로 서빙
- **데이터 정본은 `data/sessions.json`** — 브라우저가 fetch 해서 렌더
- **편집은 JSON 직접 수정** — 별도 어드민·서버·로그인 없음
- **수기 입력** — 강사·대상·참석 인원은 운영자가 JSON 에 직접 기재

라이브: <https://nyd0512.github.io/seminar-dashboard/>

---

## 1. 방문자 (그냥 보는 사람)

링크만 열면 끝.

- **대문** — 소개 이미지 + 단청 띠 + 카피
- **캘린더** — 월간 뷰, 예정/진행중/완료 색상 구분
- **타임라인** — 월별 그룹 리스트, "오늘" 구분선
- **통계** — 월별 추이 · 상태 분포 · 조직별 · 강사별

상단 검색으로 교육명·강사·조직 즉시 필터. 카드를 클릭하면 상세 모달이 뜬다.

---

## 2. 편집자 (교육 담당자)

모든 데이터는 `data/sessions.json` 하나에 들어 있다. 이 파일만 수정하면 된다.

### GitHub 웹에서 수정하기 (가장 빠름)

1. 저장소에서 `data/sessions.json` 열기
2. 오른쪽 위 **연필 아이콘** (Edit this file) 클릭
3. JSON 수정 — 항목 추가·수정·삭제
4. 페이지 맨 아래 **Commit changes** → 메시지 입력 → Commit
5. 1~2분 뒤 사이트 새로고침 → 반영 확인

### 로컬에서 수정하기 (IDE 쓰는 경우)

```bash
git clone https://github.com/nyd0512/seminar-dashboard.git
cd seminar-dashboard
# data/sessions.json 편집
git add data/sessions.json
git commit -m "Add 2026-05 sessions"
git push
```

### 새 교육 1건 추가 예시

`data/sessions.json` 은 객체 배열이다. 배열 끝에 새 객체를 추가:

```json
{
  "id": "s021",
  "title": "MCP 서버 실습",
  "topic": "도구연동",
  "date": "2026-05-28",
  "startTime": "14:00",
  "endTime": "16:00",
  "isOnline": false,
  "location": "본관 3F 교육장",
  "instructor": "홍길동",
  "audience": "SW개발팀",
  "enrolled": 0,
  "capacity": 20,
  "status": "scheduled",
  "description": "Model Context Protocol 기초와 커스텀 서버 붙이기.",
  "reviews": []
}
```

주의할 점:
- `id` 는 **중복 금지** — 기존 마지막 번호(`s020`) 다음으로
- 새 객체 바로 앞 항목 끝에 **쉼표 `,` 빠지지 않게**
- JSON 문법이 의심되면 <https://jsonlint.com> 에 붙여넣고 검증

---

## 3. JSON 스키마

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | ✅ | 고유 ID (예: `s021`) |
| `title` | string | ✅ | 교육 제목 |
| `topic` | string |  | 카테고리 (프롬프트·에이전트·개발도구 등) |
| `date` | string | ✅ | `YYYY-MM-DD` |
| `startTime` | string |  | `HH:MM` |
| `endTime` | string |  | `HH:MM` |
| `isOnline` | boolean | ✅ | 온라인(`true`) / 오프라인(`false`) |
| `location` | string |  | 장소명 또는 링크 |
| `instructor` | string | ✅ | **강사명 (수기)** |
| `audience` | string |  | 대상 조직 (예: `"SW개발팀 · 자원자"`) |
| `enrolled` | number |  | **총 참석 인원 (수기)** |
| `capacity` | number |  | **대상 정원 (수기)** |
| `status` | string | ✅ | `scheduled` · `ongoing` · `completed` |
| `description` | string |  | 교육 내용 요약 |
| `reviews` | array |  | `[{ "rating": 4.8, "comment": "..." }]` |

---

## 4. 로컬에서 실행

ES modules + `fetch` 를 쓰므로 `file://` 로 직접 열면 동작하지 않는다. 가벼운 정적 서버를 띄워야 한다.

```bash
cd seminar-dashboard
python -m http.server 8000
# 또는
npx serve .
```

브라우저로 `http://localhost:8000` 접속.

---

## 5. 배포 (GitHub Pages · branch 모드)

빌드 단계가 없어서 **GitHub Actions 워크플로우를 쓰지 않는다**. Pages 가 `main` 브랜치 루트를 그대로 서빙한다.

최초 1회 설정 (저장소 주인이 하면 됨):

1. 저장소 → **Settings → Pages**
2. **Build and deployment → Source** → `Deploy from a branch`
3. **Branch** → `main` / `/ (root)` → **Save**
4. 1~2분 뒤 `https://<owner>.github.io/<repo>/` 에서 접근 가능

이후엔 `main` 에 푸시할 때마다 자동 갱신된다. (별도 Actions 탭 확인 불필요)

### 편집 권한

- 편집 가능 = **저장소 collaborator + write 권한**
- 일반 수강생은 사이트 열람만 (읽기 전용)
- 사람 추가: Settings → Collaborators → Add people

---

## 6. 디렉토리 구조

```
seminar-dashboard/
├── index.html
├── data/
│   └── sessions.json        # ⭐ 교육 데이터 정본 (여기만 편집)
├── assets/
│   ├── hero.jpg             # 대문 일러스트 (16:7)
│   ├── hero-sm.jpg          # 모바일용 대문
│   ├── hanji-bg.jpg         # 한지 타일 배경
│   └── dancheong-band.webp  # 단청 띠 (대문 중단)
├── css/
│   ├── tokens.css           # 팔레트·타이포·간격 토큰
│   ├── base.css             # reset + body 배경
│   ├── layout.css           # 앱 쉘 (사이드바/토픽바/KPI)
│   ├── components.css       # 버튼·칩·패널·모달·토스트
│   └── views.css            # 대문·캘린더·타임라인·통계
├── js/
│   ├── data.js              # 상수·타입 정의
│   ├── store.js             # fetch + 상태 스토어
│   ├── utils.js             # 날짜·DOM·포맷 헬퍼
│   └── app.js               # 렌더링 + 이벤트 + 상세 모달
└── README.md
```

---

## 7. 자주 겪는 상황

- **편집했는데 사이트에 반영이 안 됨** → 브라우저 강력 새로고침 (`Ctrl+Shift+R`). Pages 캐시 갱신엔 1~2분 걸린다.
- **JSON 파싱 에러로 데이터가 안 뜸** → 콘솔에 "데이터를 불러오지 못했습니다" 토스트. `jsonlint.com` 으로 문법 검증.
- **상태 색이 이상함** → `status` 는 `scheduled` / `ongoing` / `completed` 3개만 허용. 오타 확인.
- **만족도가 표시 안 됨** → `reviews` 가 `[]` (빈 배열) 이거나 없으면 해당 KPI가 "—" 로 표시됨.

## 8. 브라우저 요구사항

Chrome · Edge · Safari · Firefox 최신 2버전 (ES modules, `fetch` 기반). IE 비지원.
