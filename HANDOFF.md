# 핸즈오프 — AI 전파교육 대시보드 운영

> 사용자(KHM)는 모든 작업을 Claude에게 위임합니다. 이 문서를 먼저 읽고 작업 시작.
> 마지막 갱신: 2026-04-23 (commit `e050e5c` 시점)

---

## 0. TL;DR

| 항목 | 값 |
|---|---|
| 사이트 | https://swdp-seminar-dashboard.web.app |
| GitHub | https://github.com/nyd0512/seminar-dashboard (`main`) |
| Firebase 프로젝트 ID | `swdp-seminar-dashboard` |
| 편집 비번 | `aijjang` (`js/data.js` `EDIT_PASSWORD`) |
| Firebase CLI 로그인 | `ringo.cozy@gmail.com` (이미 인증됨) |
| 자동 배포 | ❌ 없음. `firebase deploy --only hosting` 수동 실행 |

---

## 1. 자주 쓰는 명령

```powershell
# 코드/디자인 수정 후 배포 (가장 빈번)
firebase deploy --only hosting --project swdp-seminar-dashboard

# Firestore 보안 규칙만
firebase deploy --only firestore:rules --project swdp-seminar-dashboard

# 둘 다
firebase deploy --only firestore:rules,hosting --project swdp-seminar-dashboard

# 로컬 미리보기
firebase serve   # → http://localhost:5000

# GitHub push (자동 배포 X — 별도로 firebase deploy 필요)
git push origin main
```

---

## 2. 표준 절차

### A. 비밀번호 변경
1. `js/data.js`의 `EDIT_PASSWORD = 'aijjang'` 값 수정
2. `firebase deploy --only hosting --project swdp-seminar-dashboard`
3. 사용자에게 새 비번 안내

### B. 디자인/기능 수정
1. 코드 수정
2. `firebase deploy --only hosting --project swdp-seminar-dashboard`
3. **검증**: Chrome MCP로 `https://swdp-seminar-dashboard.web.app/?bust=$(timestamp)` 접속 → 동작 확인
4. (필요 시) commit + push

### C. 데이터 추가/수정/삭제
- **사용자가 사이트 UI에서 직접** 수행 (잠금 해제 후 추가/편집)
- Claude가 코드로 할 일 없음
- 정 필요하면 Firestore Console 또는 Firebase Admin SDK

### D. 보안 규칙 변경
- 현재 규칙(`firestore.rules`): sessions 컬렉션 누구나 read/write
- 수정 후 `firebase deploy --only firestore:rules --project swdp-seminar-dashboard`

---

## 3. 알려진 함정

### CDN/브라우저 캐시
- `firebase.json`이 css/js에 `Cache-Control: no-cache` 설정
- deploy 후에도 이미 페이지 떠있는 사용자 브라우저는 옛 JS 사용 가능
- **해결**: 사용자에게 `Ctrl+Shift+R` 안내, 또는 Chrome MCP 검증 시 URL에 `?bust=...` 추가

### Firebase Authentication 미활성화
- Console에서 Auth가 켜져있지 않음 (사용자가 수동으로 못 켜겠다고 함)
- 현재 보안 모델: Firestore Rules는 누구나 read/write, 클라이언트에서만 비번 검증
- 진짜 보안 필요해지면 Auth 활성화 + Rules에 `if request.auth != null` 추가 (사용자 협조 필요)

### Firestore 위치
- `(default)` DB는 `nam5` (us-central, multi-region)에 자동 생성됨
- 한국 latency 우려 시 재생성해야 하지만 현재 문제없음

### Service Account Key 노출 이력
- 초기 deploy 한 번에 admin SDK key가 약 30분간 호스팅에 공개됨
- 사용자에게 폐기 권장함 (GCP IAM에서 삭제 + 새 키 발급은 미래에 필요할 때만)
- 현재는 `firebase.json`의 `ignore`에 패턴 추가됨

### GitHub Actions 없음
- `git push`만 한다고 자동 배포 안 됨
- 수동 `firebase deploy` 필수
- 사용자가 Actions 셋업을 명시적으로 거절함

---

## 4. 데이터 / 컬렉션 구조

**컬렉션**: `sessions`  
**docId**: 자동 생성 (기존 13건은 `s01`~`s13` 보존)

| 필드 | 타입 | 비고 |
|---|---|---|
| `title` | string | 필수 |
| `topic` | string | |
| `date` | string | YYYY-MM-DD, 필수 |
| `startTime` | string | HH:MM |
| `endTime` | string | HH:MM |
| `isOnline` | boolean | |
| `location` | string | |
| `instructor` | string | |
| `audience` | string | |
| `enrolled` | number | |
| `capacity` | number | |
| `status` | string | `scheduled` / `ongoing` / `completed` |
| `description` | string | |

normalize / compareSessions 로직은 `js/schema.js` 참고.

---

## 5. 폴더 구조

```
seminar-dashboard/
├── HANDOFF.md               # ← 이 파일
├── README.md                # 사용자용 문서
├── firebase.json            # Hosting + Firestore + cache headers
├── .firebaserc              # 기본 프로젝트 = swdp-seminar-dashboard
├── firestore.rules          # 누구나 read/write
├── firestore.indexes.json   # 빈 인덱스
├── index.html               # importmap (Firebase ESM CDN) + UI
├── assets/                  # hero / 단청 / 낙관 이미지
├── css/
│   ├── tokens.css           # design tokens (--topbar-h, colors, spacing)
│   ├── base.css
│   ├── layout.css           # sidebar/topbar/main grid
│   ├── components.css
│   └── views.css
└── js/
    ├── data.js              # firebaseConfig + EDIT_PASSWORD
    ├── firebase.js          # initializeApp + getFirestore
    ├── store.js             # Firestore CRUD + onSnapshot + 비번 게이트
    ├── schema.js            # normalize / compareSessions
    ├── utils.js             # DOM/날짜 헬퍼
    └── app.js               # 렌더링 + 모달 + 편집 UI
```

---

## 6. 디자인 규칙

- **사이드바 brand 영역과 topbar는 baseline 정렬** (높이 = `--topbar-h` = 60px). 어느 한쪽 padding을 만지면 같이 맞춰야 함.
- **사이드바 footer 텍스트**: `v1.2 · 관리자 KHM` (수정 시 `index.html` `.sidebar-meta`)
- 컬러/spacing은 `css/tokens.css` CSS 변수 사용. 하드코딩 금지.

---

## 7. 사용자 (KHM) 협업 스타일

- **한국어로 소통**
- 자동화 강선호 ("다 해", "너가 해"). 자동화 가능한 건 다 자동
- OAuth, Console UI 클릭 같은 사용자 액션은 마지막 수단. 자동 시도 후 안 되면 안내
- 보안에 너무 엄격하지 않음 — 비번을 채팅에 적는 것 OK
- 짧고 명확한 진행 보고 선호 (결과 + 다음 단계)
- 긴 설명, 큰 표 같은 건 필요할 때만

---

## 8. Chrome MCP 활용 패턴

Chrome MCP가 사용 가능하면:
- 사이트 동작 검증: `tabs_context_mcp` → `navigate` → `javascript_tool`로 DOM/state 확인
- 콘솔 에러 확인: `read_console_messages` (pattern으로 필터)
- Console UI 자동 클릭은 가능하지만 selector 잡기 어려움 — 사용자 직접 안내가 더 빠를 때 많음

---

## 9. 마지막 commit
- `e050e5c` (2026-04-23): feat: migrate from Express to Firebase Hosting + Firestore
