# 핸즈오프 — AI 전파교육 대시보드 운영

> 다른 Claude 세션이 이 문서만 읽고 바로 운영을 이어받을 수 있도록 작성. 모호한 부분 발견 시 이 문서를 갱신.
>
> 마지막 갱신: 2026-04-23

---

## 0. 30초 요약

| 항목 | 값 |
|---|---|
| 메인 URL (앞으로 공유) | **https://ai-agent-edu.web.app** |
| 보조 URL (옛 URL, 같은 콘텐츠) | https://swdp-seminar-dashboard.web.app |
| GitHub | https://github.com/nyd0512/seminar-dashboard (`main`) |
| Firebase 프로젝트 ID | `swdp-seminar-dashboard` |
| Hosting 사이트 (multi-site) | `swdp-seminar-dashboard` (target=`default`) + `ai-agent-edu` (target=`agent`) |
| Firestore DB | `(default)`, 컬렉션 `sessions` |
| 편집 비번 | `aijjang` (`js/data.js` `EDIT_PASSWORD`) |
| Firebase CLI 로그인 | `ringo.cozy@gmail.com` |
| 자동 배포 | ❌ 없음. `firebase deploy` 수동 |

---

## 1. 자주 쓰는 명령

### 일반 배포 (두 사이트 동시 — 가장 자주 씀)
```powershell
firebase deploy --only hosting --project swdp-seminar-dashboard
```
→ swdp + ai-agent-edu 양쪽에 같은 콘텐츠 배포.

### 한 사이트만 배포
```powershell
# 새 URL만
firebase deploy --only hosting:agent --project swdp-seminar-dashboard

# 옛 URL만
firebase deploy --only hosting:default --project swdp-seminar-dashboard
```

### Firestore 보안 규칙만
```powershell
firebase deploy --only firestore:rules --project swdp-seminar-dashboard
```

### 전체 (rules + hosting 둘 다)
```powershell
firebase deploy --project swdp-seminar-dashboard
```

### 로컬 미리보기
```powershell
firebase serve --only hosting:agent   # 또는 hosting:default
# → http://localhost:5000
```

### GitHub 동기화 (Actions 없음 — 자동 배포 X)
```powershell
git push origin main
```

---

## 2. 표준 운영 절차

### A. 비밀번호 변경
1. `js/data.js`의 `EDIT_PASSWORD` 값 수정
2. `firebase deploy --only hosting --project swdp-seminar-dashboard`
3. 사용자에게 새 비번 알림 (운영자만 공유)

### B. 디자인/기능 수정
1. 코드 수정
2. `firebase deploy --only hosting --project swdp-seminar-dashboard`
3. **검증 (필수)**: Chrome MCP로 `?bust=$(timestamp)` 붙여서 새 URL 접속 → DOM/state 확인
4. commit + push (사용자가 명시적으로 원할 때만)

### C. 데이터 (교육 일정) 추가/수정/삭제
- **사용자가 사이트 UI에서 직접** 수행. Claude가 코드로 할 일 없음
- 잠금 해제 후 캘린더 셀의 `+` 또는 타임라인 `+ 새 교육 추가`

### D. 보안 규칙 변경
- `firestore.rules` 편집
- `firebase deploy --only firestore:rules --project swdp-seminar-dashboard`

### E. 새 호스팅 사이트 추가 (서브도메인 추가)
1. `firebase hosting:sites:create [이름] --project swdp-seminar-dashboard`
2. `.firebaserc` 의 `targets.swdp-seminar-dashboard.hosting` 에 새 target 추가
3. `firebase.json` 의 `hosting` array 에 새 항목 추가 (다른 target 설정 복사 후 `target` 필드만 변경)
4. `firebase deploy --only hosting --project swdp-seminar-dashboard`

### F. 호스팅 사이트 삭제
```powershell
firebase hosting:sites:delete [사이트이름] --project swdp-seminar-dashboard --force
```
삭제 후 `.firebaserc`, `firebase.json`에서 관련 target 제거.

### G. 강의자료(열람실) 추가/수정
- 사이드바 "열람실" = `<a target="_blank" href="./presentations/">` (별도 탭 navigate, iframe 아님)
- 새 세미나 추가:
  1. `presentations/[slug]/` 폴더 만들고 그 안에 `index.html` (또는 슬라이드 파일들) 배치
  2. `presentations/index.html` 의 `<nav class="index">` 안에 새 `<a class="item …">` 카드 추가
     - 색상 클래스: `biz` / `dev` / `lead` / `team` 중 하나
     - `href`는 `[slug]/`
  3. `firebase deploy --only hosting`
- 외부에서 강의자료 받았을 때: `presentations/` 안에 폴더 그대로 복사 + index.html 카드 추가
- 원본 scaffold 위치 (참고): `E:/workspace/presentation-scaffold/` (사용자 작업 공간, 이 repo 와 별도)
- 사용자가 "코드 수정 없이 자료만 올리고 싶다"고 함 — 향후 manifest.json 자동 생성(predeploy hook) + presentations/index.html 동적 렌더로 개선 여지 있음. 사용자 요청 들어오면 진행

---

## 3. 알려진 함정

### 브라우저/CDN 캐시
- `firebase.json` 의 css/js → `Cache-Control: no-cache`, html → `no-store`. 다음 페이지 로드는 신선
- 하지만 **이미 떠있는 페이지**는 옛 JS 사용 가능 → 사용자에게 `Ctrl+Shift+R` 안내
- Chrome MCP 검증 시 항상 URL에 `?bust=...` 붙이기

### Firebase Authentication 미활성화
- Console → Authentication 에서 "시작하기"만 누르고 Sign-in method는 미활성
- 현재 보안 모델: **Firestore Rules 누구나 read/write + 클라이언트 비번 게이트** (옛 Express 보안과 동일 수준)
- 진짜 인증 필요해지면 사용자 협조 받아 Email/Password Provider 활성화 + 사용자 추가 + Rules에 `request.auth != null` 조건

### Firestore 위치
- DB는 `(default)` (us-central, multi-region nam5). 한국 사용자 latency 약간 있지만 사용 가능 수준
- 위치 변경하려면 DB 재생성 필요 (큰 작업)

### Service Account Key 노출 이력
- 초기 deploy 시 `*-firebase-adminsdk-*.json` 키가 약 30분 호스팅에 공개됨
- 사용자에게 폐기 권장 안내함 — 새 admin 작업 필요해지면 새 키 받아서 사용
- `.gitignore` + 두 site의 `firebase.json` ignore 패턴에 `*-firebase-adminsdk-*.json` 추가됨

### GitHub Actions 없음
- `git push` 자체로는 자동 배포 안 됨. `firebase deploy` 별도 실행 필수
- 사용자가 Actions 셋업을 명시적으로 거절함 ("필요없을거같다")

### 멀티사이트 배포 시 주의
- `firebase deploy --only hosting` 은 **모든** target에 배포 (현재는 default + agent 둘 다)
- 한 사이트만 갱신하려면 `hosting:default` 또는 `hosting:agent` 명시

---

## 4. Firestore 컬렉션 구조

**컬렉션**: `sessions`
**docId**: 자동 생성 (기존 13건은 `s01`~`s13` 보존)

| 필드 | 타입 | 비고 |
|---|---|---|
| `title` | string | 필수 |
| `topic` | string | 카테고리 (Agentic AI, 페어 프로그래밍, 리더십 등) |
| `date` | string | YYYY-MM-DD, 필수 |
| `startTime` | string | HH:MM, 옵션 |
| `endTime` | string | HH:MM, 옵션 |
| `isOnline` | boolean | 온라인/오프라인 |
| `location` | string | |
| `instructor` | string | |
| `audience` | string | 대상 조직 |
| `enrolled` | number | 참석 인원 |
| `capacity` | number | 정원 |
| `status` | string | `scheduled` / `ongoing` / `completed` |
| `description` | string | |

normalize / 정렬 로직: `js/schema.js`. document에 `id` 필드 저장 안 하고, 클라이언트에서 `doc.id` 를 객체 `id`로 매핑.

---

## 5. 프로젝트 폴더 구조

```
seminar-dashboard/
├── HANDOFF.md               # 이 파일 (Claude 운영 매뉴얼)
├── README.md                # 사용자/방문자용 문서
├── firebase.json            # Hosting (multi-site array) + Firestore 설정
├── .firebaserc              # default 프로젝트 + hosting targets
├── firestore.rules          # 누구나 read/write
├── firestore.indexes.json   # 빈 인덱스
├── index.html               # importmap (Firebase ESM CDN) + UI (4 nav: 대문/캘린더/타임라인/열람실)
├── assets/                  # hero / 단청 / 낙관 / brand-mark (한옥 일러스트)
├── presentations/           # 강의자료 (열람실 view 가 iframe 으로 표시)
│   ├── index.html           # 4개 세미나 인덱스 (다크 테마, presentation-scaffold 원본)
│   ├── non-dev-seminar/     # Biz: AI가 바꾸는 일하는 방법
│   ├── dev-seminar/         # Dev: Claude Code Hands-on
│   ├── leadership-hands-on/ # Lead: AI Hands-on Course
│   ├── controller_seminar/  # Team: S/W개발팀 AI PoC 현황
│   └── assets/              # 공유 데이터·이미지·랩·페이퍼·비디오
├── css/
│   ├── tokens.css           # design tokens (--topbar-h, colors, spacing)
│   ├── base.css
│   ├── layout.css           # sidebar/topbar/main grid
│   ├── components.css
│   └── views.css            # cover/calendar/timeline/reading 뷰
└── js/
    ├── data.js              # firebaseConfig + EDIT_PASSWORD + 상수
    ├── firebase.js          # initializeApp + getFirestore
    ├── store.js             # Firestore CRUD + onSnapshot + 비번 게이트
    ├── schema.js            # normalize / compareSessions
    ├── utils.js             # DOM/날짜 헬퍼
    ├── app.js               # 부트스트랩 + ui state + renderAll + switchView + nav/topbar/lock/toast/modal primitives
    ├── views.js             # 캘린더 + 타임라인 렌더·컨트롤
    └── modals.js            # detail / password / session form 모달
```

### JS 모듈 의존 그래프
```
app.js  ─┬→ views.js  ─→ modals.js
         └→ modals.js
views.js / modals.js  ─→ app.js  (ui state, openModal/closeModal, toast, openPasswordModal)
                      ─→ store.js, utils.js, data.js
```
ESM cyclic import 있음 (app ↔ views, app ↔ modals). 런타임 호출 시 resolve 되므로 정상 작동. 모듈 분리 시 이 구조를 유지할 것.

---

## 6. 디자인 규칙 (지켜야 할 것)

- **사이드바 brand 영역과 topbar는 60px 정렬** (`--topbar-h`). brand 또는 topbar padding을 만지면 같이 맞춰야 함
- **사이드바 footer 텍스트**: `v1.2 · 관리자 KHM` (`index.html`의 `.sidebar-meta`)
- **컬러/spacing**: `css/tokens.css` CSS 변수만 사용. 하드코딩 금지
- **brand-mark**: 한옥 정자 일러스트 (`assets/brand-mark.png`, 배경 투명). 36x36, object-fit: contain
- **캘린더 가시성 기준**:
  - 날짜 숫자: `--fs-md (14px)`, `--fw-bold`
  - 요일 헤더: `--fs-sm (12px)`, `--text-primary`
  - 이벤트: `--fs-sm (12px)`, `--fw-semibold`, height 24px
  - 셀 배경: `rgba(255, 252, 246, 0.94)` (불투명 ↑)
- **상단 tally 표기**: `교육 N회 · 누적 수강 X명 (동일인 누적 포함)`

---

## 7. Firebase Web SDK 버전

- ESM CDN 고정 버전: `10.14.1` (`index.html` importmap)
  - `firebase/app`, `firebase/firestore`
  - Auth 모듈 import 안 함 (사용 안 함)
- 업그레이드 시 importmap만 수정 후 재배포. breaking change는 Firebase 릴리즈 노트 확인

---

## 8. Chrome MCP 활용 패턴 (검증 시)

```
1. tabs_context_mcp                                # 탭 ID 확인
2. navigate(url + ?bust=...)                       # 캐시 우회
3. javascript_tool: setTimeout(2500) → DOM/state   # 렌더링 대기 후 확인
4. read_console_messages(pattern: 'error|store')   # 에러 모니터
```

⚠️ Firebase Console UI 자동 클릭은 selector가 자주 튀어 어려움. 사용자 직접 안내가 더 빠를 때 많음.

---

## 9. 사용자 (KHM) 협업 스타일

- **한국어로 소통**
- **자동화 강선호**: "다 해", "너가 해" → 가능한 모두 Claude가 처리
- **OAuth/브라우저 로그인** 같은 사용자 본인 액션만 안내. 그 외는 자동
- **Firebase Console UI 조작 어려워함** — 단계별 자세한 안내 필요. 자동화 가능한 건 자동
- **보안 엄격하지 않음** — 비번을 채팅에 적는 것 OK. 비번 노출 후 변경 권장
- **짧고 명확한 보고 선호** — 결과 + 다음 단계만. 긴 설명·큰 표는 필요할 때만
- 코드/CLI 우선, UI 클릭은 마지막 수단
- 진행 중에 사용자가 새 요청 끼어들면 그 요청 우선 처리

---

## 10. 진행 중 commit/push 가이드

- 코드 수정 + 배포 후 **사용자가 만족하면** commit + push
- commit 메시지 한국어 OK, 영어 OK. 일관성 유지 (현재까지 영어 prefix + 한국어 본문)
- co-author trailer 추가:
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```
- main 브랜치에 직접 push (PR 안 씀)

---

## 11. 마지막 큰 변경

| commit | 내용 |
|---|---|
| `e050e5c` | feat: migrate from Express to Firebase Hosting + Firestore |
| `46d40a7` | docs: add HANDOFF.md |
| `674e909` | ui: hanok-gate brand mark |
| `5d7a06f` | ui: brand-mark transparent bg |
| `9f47d27` | ui: tally "(동일인 누적 포함)" |
| `9a2e38d` | ui(calendar): legibility boost |
