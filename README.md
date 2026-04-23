# AI 전파교육 대시보드

SW개발팀 내부 **AI 전파교육 진행 현황 게시판**. 지난 교육과 예정된 세션을 한 화면에서 공유하고, 담당자가 화면에서 직접 추가·수정할 수 있는 가벼운 사내 캘린더.

> 🌐 **메인 URL**: <https://ai-agent-edu.web.app>
> 🌐 보조 URL (같은 콘텐츠): <https://swdp-seminar-dashboard.web.app>

---

## ✨ 한눈에

- **백엔드**: Firebase (Hosting + Firestore). 별도 서버 없음
- **프런트**: Vanilla JS + 정적 HTML/CSS, 빌드 단계 없음 (Firebase Web SDK는 ESM CDN)
- **편집 모델**: 읽기는 누구나, 편집은 비밀번호로 잠금 해제 (현재 세션에만 유지)
- **호스팅 멀티 사이트**: 한 Firebase 프로젝트에 두 개의 `.web.app` URL — 같은 콘텐츠 동시 배포

---

## 1. 사용법

### 방문자 (URL 공유받은 사람)
링크만 열면 끝. **대문 / 캘린더 / 타임라인 / 열람실** 4개 뷰. 상단 검색으로 즉시 필터.

> **열람실**: 강의자료 다운로드 전용.

### 편집자 (담당자)
1. 우측 상단 **🔒 편집 잠금** 버튼 클릭
2. 비밀번호 입력 → 잠금 해제 (현재 세션에만 유지, 탭 닫으면 다시 잠긴다)
3. 캘린더 셀의 **+** 버튼 또는 타임라인 상단 **+ 새 교육 추가**
4. 항목 클릭 → 상세 모달 → **편집 / 삭제**
5. 작업 후 다시 잠금 버튼을 눌러 잠금

> 비번 변경은 `js/data.js`의 `EDIT_PASSWORD` 값만 바꾸고 재배포.

---

## 2. 기술 스택

| 레이어 | 사용 |
|---|---|
| 호스팅 | Firebase Hosting (글로벌 CDN, 무료 Spark 플랜) |
| DB | Cloud Firestore (NoSQL, 무료 한도 안에서) |
| 프런트 | Vanilla ES Modules, importmap, Firebase Web SDK 10.14.1 (ESM CDN) |
| 빌드 | 없음. 정적 파일 그대로 |
| 인증 | 미사용 (Firebase Auth 비활성화). 클라이언트 측 비번 게이트만 |
| 자동 배포 | 없음 (`firebase deploy` 수동) |

---

## 3. ⚠️ 지켜야 할 것 (운영 규칙)

### 보안
- **`EDIT_PASSWORD`는 클라이언트 노출 비번** — 평문으로 코드에 들어감. 진짜 비밀이 아닌 "낙서 방지용". 노출 강도가 옛 Express 모델(평문 헤더)과 동일
- **Firestore Rules는 누구나 read/write 허용** — 진짜 인증이 필요해지면 Firebase Auth 활성화 + Rules 강화
- **서비스 계정 키(`*-firebase-adminsdk-*.json`) 절대 commit 금지** — `.gitignore` + `firebase.json`의 `ignore`에 패턴 추가됨

### 디자인
- 컬러/spacing은 **`css/tokens.css` CSS 변수만** 사용. 하드코딩 금지
- 사이드바 brand 영역과 topbar는 **60px(`--topbar-h`) baseline 정렬**. 어느 한쪽 padding 만질 때 같이 맞추기
- 사이드바 footer 텍스트: `v1.2 · 관리자 KHM`

### 캐시
- `firebase.json`에서 css/js → `Cache-Control: no-cache`, html → `no-store`
- 그래도 이미 떠있는 페이지는 옛 코드 사용 가능 → 사용자에게 **`Ctrl+Shift+R`** 안내

### 배포
- **자동 배포 없음**. 코드 수정 → `firebase deploy` 수동 실행 필수
- 멀티사이트라 `firebase deploy --only hosting` 하면 두 URL 동시 배포

### 데이터
- Firestore document에 `id` 필드 저장 안 함. 클라이언트에서 `doc.id`를 객체 `id`로 매핑
- 새 데이터는 자동 ID, 기존 13건은 `s01`~`s13` 보존

---

## 4. 운영 명령

### 코드 수정 후 배포 (가장 자주 씀)
```bash
firebase deploy --only hosting --project swdp-seminar-dashboard
```

### 한 사이트만 배포
```bash
firebase deploy --only hosting:agent --project swdp-seminar-dashboard      # 새 URL만
firebase deploy --only hosting:default --project swdp-seminar-dashboard    # 옛 URL만
```

### Firestore 규칙만 배포
```bash
firebase deploy --only firestore:rules --project swdp-seminar-dashboard
```

### 강의자료 추가 (열람실)
1. `presentations/files/` 폴더에 파일을 넣는다 (파일명 규칙: `YYYY-MM-DD__카테고리__제목.확장자`, 규칙 안 맞춰도 OK)
2. `firebase deploy --only hosting --project swdp-seminar-dashboard`
3. 끝. `manifest.json` 은 predeploy hook 이 자동 생성 (코드 수정 없음)

### 로컬 미리보기
```bash
firebase serve --only hosting:agent
# → http://localhost:5000
```

### GitHub 동기화 (자동 배포 없음 — 별도로 deploy 필요)
```bash
git push origin main
```

---

## 5. 데이터 스키마 (Firestore document)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| (docId) | string | ✅ | Firestore 자동 ID (기존 13건은 `s01`~`s13`) |
| `title` | string | ✅ | 교육 제목 |
| `topic` | string |  | 카테고리 |
| `date` | string | ✅ | `YYYY-MM-DD` |
| `startTime` | string |  | `HH:MM` |
| `endTime` | string |  | `HH:MM` |
| `isOnline` | boolean |  | 온라인/오프라인 |
| `location` | string |  | 장소명 또는 링크 |
| `instructor` | string |  | 강사명 |
| `audience` | string |  | 대상 조직 |
| `enrolled` | number |  | 참석 인원 |
| `capacity` | number |  | 정원 |
| `status` | string |  | `scheduled` · `ongoing` · `completed` |
| `description` | string |  | 교육 내용 요약 |

---

## 6. 디렉토리 구조

```
seminar-dashboard/
├── HANDOFF.md               # Claude/AI 에이전트 운영 매뉴얼
├── README.md                # 이 파일
├── firebase.json            # Hosting (multi-site array) + Firestore
├── .firebaserc              # 기본 프로젝트 + hosting targets
├── firestore.rules          # 누구나 read/write
├── firestore.indexes.json
├── index.html
├── assets/
│   ├── brand-mark.png       # 한옥 정자 일러스트 (사이드바 홈 버튼)
│   ├── hero.jpg / hero-sm.jpg
│   ├── dancheong-band.webp
│   ├── hanji-bg.jpg
│   └── seal-ji.webp
├── presentations/
│   ├── index.html           # 발표자료 슬라이드 인덱스 (외부 탭)
│   ├── files/               # ⭐ 자료실 다운로드 파일 — 여기에 넣고 deploy
│   ├── non-dev-seminar/ 등  # 발표자료 슬라이드 (HTML)
│   └── assets/
├── scripts/
│   └── build-materials-manifest.mjs  # predeploy: files/ 스캔 → manifest.json
├── css/
│   ├── tokens.css           # design tokens
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   └── views.css
└── js/
    ├── data.js              # firebaseConfig + EDIT_PASSWORD
    ├── firebase.js          # SDK 초기화 (app, db)
    ├── store.js             # Firestore CRUD + onSnapshot + 비번 게이트
    ├── schema.js            # normalize / compareSessions
    ├── utils.js
    └── app.js               # 렌더링 + 모달 + 편집 UI
```

---

## 7. 자주 겪는 상황

- **비밀번호 입력해도 안됨** → `js/data.js`의 `EDIT_PASSWORD`와 정확히 일치하는지 확인 (현재 `aijjang`). 캐시된 옛 코드면 `Ctrl+Shift+R`
- **Firestore 데이터가 안 보임** → DevTools Console 에러 확인. `firestore.rules`가 잘못됐을 때 또는 새로 만든 DB가 자동 생성된 직후 일시적 문제
- **importmap 오류** → 최신 Chrome/Edge/Safari/Firefox 필요. IE는 미지원
- **GitHub push 했는데 사이트 안 바뀜** → Actions 자동 배포 없음. `firebase deploy --only hosting` 별도 실행

---

## 8. 신규 운영자 온보딩

1. Firebase CLI 설치: `npm install -g firebase-tools`
2. 로그인: `firebase login` (Google 계정으로 OAuth)
3. 이 repo clone: `git clone https://github.com/nyd0512/seminar-dashboard.git`
4. 운영 명령 (위 §4) 시도 — 권한 OK 확인
5. **`HANDOFF.md` 정독** — 더 자세한 내부 정보·함정·자동화 패턴
