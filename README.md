# AI 전파교육 대시보드

SW개발팀 내부 **AI 전파교육 진행 현황 게시판**. 지난 교육과 예정된 세션을 한 화면에서 공유하고, 담당자가 화면에서 직접 추가·수정할 수 있는 가벼운 사내 캘린더.

- **백엔드**: Node.js + Express, JSON 파일(`data/sessions.json`) 한 개가 정본 (atomic write)
- **프런트**: Vanilla JS + 정적 HTML/CSS, 빌드 단계 없음
- **편집 모델**: 읽기는 누구나, 편집은 비밀번호로 잠금 해제 (세션 동안만 유지)
- **공유 모델**: 로컬 PC 또는 사내 VM에서 항상 띄워두고 URL 공유

---

## 1. 빠른 시작

```bash
git clone <repo-url> lecture-dashboard
cd lecture-dashboard
npm install
npm start
# → http://localhost:7271
```

다른 포트가 필요하면:

```bash
PORT=8080 npm start
```

비밀번호는 환경변수로 바꿀 수 있다 (기본값 `aijjang`):

```bash
EDIT_PASSWORD=secret npm start
```

요구사항: **Node.js ≥ 18.18**.

---

## 2. 방문자 (URL 공유받은 사람)

링크만 열면 끝.

- **대문** — 전통화 이미지 + 낙관 + 단청 띠 + 사자성어 카피
- **캘린더** — 월간 뷰, 예정/진행중/완료 색상 구분
- **타임라인** — 월별 그룹 리스트, "오늘" 구분선

상단 검색으로 교육명·강사·조직 즉시 필터. 항목을 클릭하면 상세 모달이 뜬다. 상단 좌측에 누적 교육·수강 인원 배지가 표시된다.

---

## 3. 편집자 (담당자)

1. 우측 상단 **🔒 편집 잠금** 버튼 클릭
2. 비밀번호 입력 → 잠금 해제 (현재 세션에만 유지, 탭을 닫으면 다시 잠긴다)
3. 캘린더 셀에 마우스를 올리면 나타나는 **+** 버튼, 또는 타임라인 상단 **+ 새 교육 추가** 버튼으로 추가
4. 항목을 클릭해 상세 모달의 **편집 / 삭제** 버튼으로 수정
5. 작업이 끝나면 다시 잠금 버튼을 눌러 잠금

서버는 변경 내용을 즉시 `data/sessions.json` 에 atomic write (`tmp → rename`) 로 반영한다. 추가로 git 에 커밋할지 여부는 운영 정책에 따라 결정.

---

## 4. JSON 스키마

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string |  | 미입력 시 서버가 `s14`, `s15` … 자동 채번 |
| `title` | string | ✅ | 교육 제목 |
| `topic` | string |  | 카테고리 (프롬프트·에이전트·개발도구 등) |
| `date` | string | ✅ | `YYYY-MM-DD` |
| `startTime` | string |  | `HH:MM` |
| `endTime` | string |  | `HH:MM` |
| `isOnline` | boolean |  | 온라인(`true`) / 오프라인(`false`) |
| `location` | string |  | 장소명 또는 링크 |
| `instructor` | string |  | 강사명 |
| `audience` | string |  | 대상 조직 |
| `enrolled` | number |  | 참석 인원 |
| `capacity` | number |  | 정원 |
| `status` | string |  | `scheduled` · `ongoing` · `completed` (기본 `scheduled`) |
| `description` | string |  | 교육 내용 요약 |

---

## 5. REST API

읽기는 공개, 쓰기는 `X-Edit-Password` 헤더 필수.

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| `GET`    | `/api/sessions`        |  | 전체 목록 (날짜 오름차순) |
| `GET`    | `/api/sessions/:id`    |  | 단건 조회 |
| `POST`   | `/api/sessions`        | ✅ | 생성 |
| `PUT`    | `/api/sessions/:id`    | ✅ | 부분 수정 (보낸 필드만 갱신) |
| `DELETE` | `/api/sessions/:id`    | ✅ | 삭제 |
| `POST`   | `/api/auth`            |  | `{ password }` 검증 (UI 잠금 해제용) |

예시:

```bash
curl -X POST http://localhost:7271/api/sessions \
  -H 'Content-Type: application/json' \
  -H 'X-Edit-Password: aijjang' \
  -d '{"title":"MCP 실습","date":"2026-05-28","status":"scheduled"}'
```

---

## 6. 사내 VM 배포

```bash
# (1) 코드 복사
git clone <repo-url> /opt/lecture-dashboard
cd /opt/lecture-dashboard
npm install --omit=dev

# (2) 비밀번호·포트 지정해 띄우기 (예: pm2)
PORT=8080 EDIT_PASSWORD='실제비번' pm2 start server/index.js \
  --name lecture-dashboard

pm2 save
pm2 startup    # 부팅 시 자동 실행 등록
```

리버스 프록시(nginx 등) 뒤에 두면 사내 도메인으로 접근 가능. HTTPS 필수는 아니지만 비밀번호가 평문으로 가므로 사내망 외부 노출 시에는 TLS 권장.

---

## 7. 디렉토리 구조

```
lecture-dashboard/
├── package.json
├── server/
│   ├── index.js             # Express 앱 + REST 라우트
│   └── store.js             # JSON 파일 store (atomic write)
├── data/
│   └── sessions.json        # ⭐ 교육 데이터 정본
├── index.html
├── assets/                  # hero / 단청 / 낙관 이미지
├── css/                     # tokens / base / layout / components / views
└── js/
    ├── data.js              # 상수·API 경로
    ├── store.js             # REST 호출 + 편집 모드 상태
    ├── utils.js             # 날짜·DOM·포맷 헬퍼
    └── app.js               # 렌더링 + 모달 + 편집 UI
```

---

## 8. 자주 겪는 상황

- **편집 버튼이 안 보임** → 우측 상단 잠금 버튼이 회색이면 잠긴 상태. 클릭해 비번 입력.
- **저장 실패: invalid password** → 비번 만료 또는 변경. 잠금 다시 해제.
- **JSON 파일이 깨졌을까 걱정** → `data/sessions.json` 옆 `.tmp` 파일이 남아 있다면 마지막 쓰기가 중단된 흔적이니 검토 후 삭제.
- **포트 충돌 (`EADDRINUSE`)** → `PORT=다른번호 npm start`.

---

## 9. 브라우저 요구사항

Chrome · Edge · Safari · Firefox 최신 2버전 (ES modules, `fetch` 기반).
