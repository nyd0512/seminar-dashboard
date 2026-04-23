# AI 전파교육 대시보드

SW개발팀 내부 **AI 전파교육 진행 현황 게시판**. 지난 교육과 예정된 세션을 한 화면에서 공유하고, 담당자가 화면에서 직접 추가·수정할 수 있는 가벼운 사내 캘린더.

- **백엔드**: Firebase (Firestore + Hosting). 별도 서버 없음
- **프런트**: Vanilla JS + 정적 HTML/CSS, 빌드 단계 없음 (Firebase Web SDK는 ESM CDN)
- **편집 모델**: 읽기는 누구나, 편집은 비밀번호로 잠금 해제 (현재 세션에만 유지)
- **공유 모델**: `https://swdp-seminar-dashboard.web.app` URL 한 줄 공유

> 사내 게시판이라 진짜 인증 대신 공유 비밀번호 1개로 보호합니다. 비밀번호 변경은 `js/data.js` 의 `EDIT_PASSWORD` 만 바꾸고 재배포.

---

## 1. 사용법

### 방문자
링크만 열면 끝. **대문 / 캘린더 / 타임라인** 3개 뷰. 상단 검색으로 즉시 필터.

### 편집자
1. 우측 상단 **🔒 편집 잠금** 버튼 클릭
2. 비밀번호 입력 → 잠금 해제 (현재 세션에만 유지, 탭 닫으면 다시 잠긴다)
3. 캘린더 셀의 **+** 버튼 또는 타임라인 상단 **+ 새 교육 추가**
4. 항목 클릭 → 상세 모달 → **편집 / 삭제**
5. 작업 후 다시 잠금 버튼을 눌러 잠금

---

## 2. 데이터 스키마 (Firestore document)

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

## 3. 디렉토리 구조

```
seminar-dashboard/
├── firebase.json            # Hosting + Firestore 설정
├── .firebaserc              # 기본 프로젝트
├── firestore.rules          # 보안 규칙
├── firestore.indexes.json
├── index.html
├── assets/                  # hero / 단청 / 낙관
├── css/
└── js/
    ├── data.js              # firebaseConfig + EDIT_PASSWORD
    ├── firebase.js          # SDK 초기화
    ├── store.js             # Firestore CRUD + 비번 게이트
    ├── schema.js            # normalize / compareSessions
    ├── utils.js
    └── app.js               # 렌더링 + 모달 + 편집 UI
```

---

## 4. 운영

### 비밀번호 변경
`js/data.js` 의 `EDIT_PASSWORD` 값만 수정 후:
```bash
firebase deploy --only hosting
```

### 코드 수정 후 재배포
```bash
firebase deploy --only hosting
```

### Firestore 규칙 변경 시
```bash
firebase deploy --only firestore:rules
```

### 로컬 미리보기
```bash
firebase serve
# → http://localhost:5000
```

---

## 5. 자주 겪는 상황

- **비밀번호 입력해도 안됨** → `js/data.js` 의 `EDIT_PASSWORD` 와 일치하는지 확인 (현재 `aijjang`).
- **Firestore 데이터가 안 보임** → DevTools Console 에러 확인. 보통 `firestore.rules` 가 잘못됐을 때.
- **importmap 오류** → 최신 Chrome/Edge/Safari/Firefox 필요. IE는 미지원.
