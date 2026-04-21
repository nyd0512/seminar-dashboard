# AI 전파교육 대시보드

SW개발팀 내부 **AI 전파교육 진행 현황 게시판**. 지난 교육과 예정된 교육을 한 화면에서 공유하기 위한 정적 사이트.

- **Vanilla JS (ES modules) + 정적 HTML/CSS** — 빌드 없음, GitHub Pages 바로 배포
- **`data/sessions.json` 이 정본** — 브라우저가 fetch 해서 보여줌
- **편집은 GitHub에서 JSON 파일 직접 수정** — 별도 인증·API·서버 없음
- **수기 입력** — 강사·대상·수강인원·정원 모두 담당자가 JSON에 직접 기재

## 스크린 구성

- **대문** — 히어로 이미지 + KPI + 빠른 이동
- **캘린더** — 월간 뷰, 상태 색상 칩 (예정/진행중/완료)
- **타임라인** — 최신순 리스트, 월별 그룹, 오늘 기준 구분선
- **통계** — 월별 추이, 상태 분포, 조직별 수강 인원, 강사별 진행 건수
- **상세 모달** — 강사·대상·수강현황·설명·후기

## 데이터 편집 방법

모든 교육 데이터는 `data/sessions.json` 한 파일에 배열로 있다. 편집은 **저장소에 쓰기 권한이 있는 사람**이 GitHub에서 직접 수정한다.

### GitHub 웹에서 수정 (가장 빠른 방법)

1. 저장소 → `data/sessions.json` 파일 열기
2. 우측 상단 연필 아이콘 클릭 (Edit this file)
3. JSON 수정 (추가·수정·삭제)
4. 하단 "Commit changes" → 커밋 메시지 입력 → Commit
5. `main` 브랜치에 푸시되면 Actions가 자동으로 Pages 재배포 (약 30초)
6. 배포 완료 후 사이트 새로고침 → 반영됨

### 로컬에서 수정 (IDE 사용)

```bash
git clone https://github.com/nyd0512/seminar-dashboard.git
cd seminar-dashboard
# data/sessions.json 편집
git add data/sessions.json
git commit -m "Add 2026-05 sessions"
git push
```

### 새 교육 1건 추가 예시

`data/sessions.json` 배열의 끝에 객체 하나 추가:

```json
{
  "id": "s021",
  "title": "새 교육 제목",
  "topic": "개발도구",
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
  "description": "교육 내용 요약",
  "reviews": []
}
```

> `id` 는 중복되지 않게 — 기존 마지막 id 다음 번호로 하면 편하다.
> 앞 항목 끝에 쉼표(`,`)가 빠지지 않도록 주의.

## JSON 스키마

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | ✅ | 고유 ID. 예: `s021` |
| `title` | string | ✅ | 교육 제목 |
| `topic` | string |  | 카테고리 (예: 프롬프트·에이전트·개발도구) |
| `date` | string | ✅ | `YYYY-MM-DD` |
| `startTime` | string |  | `HH:MM` |
| `endTime` | string |  | `HH:MM` |
| `isOnline` | boolean | ✅ | 온라인(`true`) / 오프라인(`false`) |
| `location` | string |  | 장소명 또는 링크 |
| `instructor` | string |  | 강사명 (수기) |
| `audience` | string |  | 대상 조직 (수기, `·` 로 구분) |
| `enrolled` | number |  | 수강 인원 (수기) |
| `capacity` | number |  | 정원 (수기) |
| `status` | string | ✅ | `scheduled` / `ongoing` / `completed` |
| `description` | string |  | 교육 내용 |
| `reviews` | array |  | `[{ "rating": 4.8, "comment": "..." }]` |

JSON 문법 실수가 걱정되면 <https://jsonlint.com> 에 붙여넣고 검증.

## 로컬 실행

ES 모듈 + fetch 때문에 `file://` 로는 동작하지 않는다. 가벼운 정적 서버가 필요:

```bash
cd dashboard
python -m http.server 8000
# 또는
npx serve .
```

`http://localhost:8000` 접속.

## 배포 (GitHub Pages)

`main` 브랜치 푸시 시 `.github/workflows/deploy.yml` 이 자동으로 GitHub Pages에 배포한다.

최초 1회 설정:

1. 저장소 → **Settings → Pages → Build and deployment → Source** → `GitHub Actions`
2. `main` 에 푸시하면 Actions 탭에서 배포 진행 상황 확인
3. 완료 후 `https://<owner>.github.io/<repo>/` 에서 접근 가능

## 편집 권한 관리

- 편집할 수 있는 사람 = **저장소 collaborator + write 권한 보유자**
- 일반 수강생은 사이트만 열람 (읽기 전용)
- collaborator 추가: 저장소 → Settings → Collaborators → Add people
- 외부 공개 저장소라면 Issues/Discussions 로 수정 요청을 받고 담당자가 반영하는 방식도 가능

## 디렉토리 구조

```
seminar-dashboard/
├── index.html
├── data/
│   └── sessions.json          # 교육 데이터 정본 (여기만 편집)
├── assets/
│   ├── hero.jpg            # 대문 일러스트
│   ├── hero-sm.jpg         # 모바일 대문
│   ├── hanji-bg.jpg        # 한지 배경 타일 (body)
│   └── dancheong-band.webp # 단청 띠 (대문 상단)
├── css/
│   ├── tokens.css
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   └── views.css
├── js/
│   ├── data.js                # 상수·타입 정의
│   ├── store.js               # fetch + 정규화
│   ├── utils.js               # 날짜·DOM·포맷 헬퍼
│   └── app.js                 # 렌더링 + 이벤트 + 상세 모달
└── .github/workflows/
    └── deploy.yml             # Pages 자동 배포
```

## 브라우저 요구사항

- Chrome/Edge/Safari/Firefox 최신 2버전 (ES modules, fetch)
- IE 비지원
