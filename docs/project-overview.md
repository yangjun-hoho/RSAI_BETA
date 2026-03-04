# 남양주시 스마트도시과 AI-Agent 프로젝트 설계 문서

> 공무원 업무 효율화를 위한 AI 통합 플랫폼

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | 남양주 AI (ARES AI) |
| 버전 | rsai_ver1 |
| 대상 | 남양주시 스마트도시과 공무원 |
| 목적 | AI를 활용한 업무 자동화 및 생산성 향상 |
| 프레임워크 | Next.js 16.1.6 App Router |
| 배포 환경 | Rocky Linux 서버 (PM2 + Nginx) |
| 접근 방식 | 내부망 전용 서비스 |

---

## 2. 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| AI - 채팅 | OpenAI GPT-4o-mini, Google Gemini 2.0 Flash Lite |
| AI - 업무도구 | Gemini 2.0 Flash Lite (보고서/보도자료/인사말 등) |
| RAG | OpenAI text-embedding-3-small + SQLite (better-sqlite3) |
| TTS | Edge TTS (Microsoft, edge-tts CLI) |
| 문서 파싱 | pdf-parse, mammoth (Word) |
| 지도 | Leaflet + V-World API (행안부 공간정보 오픈플랫폼) |
| 스타일링 | Inline CSS (style prop 방식, 외부 라이브러리 없음) |
| 프로세스 관리 | PM2 (ecosystem.config.js) |
| 웹서버 | Nginx (리버스 프록시) |

---

## 3. 서비스 구조

```
남양주 AI
├── 메인 채팅 (/)                   ← SSE 스트리밍 AI 채팅 + 사이드바 도구
├── 업무지원 도구 (/work-support/)   ← AI 업무 특화 툴 모음 (독립 페이지)
├── RAG 지식베이스 (사이드바)         ← 문서 업로드 → 임베딩 → 검색 증강
└── FuN fUn (/fun/)                 ← 직원 휴식 미니앱 10종 (다크/데이 모드)
```

---

## 4. 주요 기능

### 4-1. 메인 채팅
- GPT-4o-mini / Gemini 2.0 Flash Lite 모델 선택 가능
- SSE(Server-Sent Events) 기반 실시간 스트리밍 응답
- 대화 이력 localStorage 저장/불러오기/내보내기
- 채팅 내에서 업무도구 폼 직접 호출 (사이드바 8가지 단축키)
- 파일 첨부 지원 (PDF, DOCX, TXT → 텍스트 추출 후 컨텍스트 주입)
- RAG 모드: 업로드된 내부 문서 기반 질의응답

### 4-2. 업무지원 도구 (10종)

| 도구 | 설명 | API 경로 |
|------|------|----------|
| 보고서 작성 | 유형/길이 선택 → AI 초안 생성 + 인라인 에디터 | `/api/work-support/report` |
| PPT 생성 | 텍스트 or 파일 업로드 → pptxgenjs 슬라이드 변환 | `/api/work-support/ppt-converter` |
| 인사말 작성 | 행사 유형별 템플릿 기반 인사말 생성 | `/api/work-support/greetings` |
| 공적조서 | 대상/직급/공적 입력 → 표창 공적 문안 생성 | `/api/work-support/merit-citation` |
| 보도자료 | 입력 → 제목 후보 3개 선택 → 전문 생성 | `/api/work-support/press-release` |
| 시나리오 생성 | 행사/상황별 진행 시나리오 자동 작성 | `/api/work-support/scenario-generator` |
| 텍스트 음성변환 | Edge TTS, 20여 가지 음성/속도/피치 조절 | `/api/work-support/text-to-speech` |
| 연속지적도 | Leaflet + V-World 주소 검색 지적도 오버레이 | `/api/work-support/cadastral-map` |
| Nano Banana AI | AI 이미지 생성 (서버 전역 일일 10회 제한) | - |
| 화면 녹화 | 브라우저 기반 MediaRecorder API 화면 캡처 | - |

### 4-3. RAG 지식베이스

**구조**
```
문서 업로드 → 텍스트 추출 → 500자 청크(100자 오버랩) → OpenAI 임베딩 → SQLite 저장
질의 → 질문 임베딩 → 코사인 유사도 검색 → 상위 청크 → GPT 컨텍스트 주입
```

**세부 사항**
- 지원 형식: PDF, DOCX, TXT
- 임베딩 모델: `text-embedding-3-small` (1536차원)
- DB: `data/rag.db` (better-sqlite3, WAL 모드)
- 벡터 캐시: 모듈 레벨 Map (서버 재시작 시 초기화)
- 카테고리: 완전 동적 — 관리자 UI에서 CRUD (이름/이모지/색상/설명)
- 뷰 3종: 갤러리(카테고리 카드) / 채팅(RAG 질의) / 관리자(문서 업로드·삭제)

**API 엔드포인트**

| 메서드 | 경로 | 기능 |
|--------|------|------|
| POST | `/api/rag/query` | RAG 질의응답 |
| GET | `/api/rag/admin/categories` | 카테고리 목록 |
| POST | `/api/rag/admin/categories` | 카테고리 생성 |
| DELETE | `/api/rag/admin/categories?id=` | 카테고리 삭제 |
| POST | `/api/rag/admin/upload` | 문서 업로드 + 임베딩 |
| GET | `/api/rag/admin/documents?categoryId=` | 문서 목록 |
| DELETE | `/api/rag/admin/documents?id=` | 문서 삭제 |

### 4-4. FuN fUn (직원 휴식 코너)

공무원 특화 미니앱 10종. 다크모드(우주 배경 Canvas 애니메이션) / 데이모드(스파클 파티클 CSS 애니메이션) 지원.

| 앱 | 설명 |
|----|------|
| MBTI 테스트 | 공무원 유형 MBTI 진단 |
| 사다리 게임 | 인원 입력 → Canvas 사다리 자동 생성 |
| 점심메뉴 룰렛 | 메뉴 입력 → Canvas 룰렛 스핀 |
| 퇴근 카운트다운 | 퇴근 시간 설정 → 실시간 카운트다운 |
| 밸런스 게임 | 공무원 공감 양자택일 질문 |
| 오늘의 운세 | 업무 관련 오늘의 운세 |
| 팀 랜덤 배정 | 이름 입력 → 랜덤 팀 분배 |
| 주사위 굴리기 | 1~2개 주사위, Canvas 3D 렌더링 |
| 가위바위보 | AI 대전, 승률 기록 |
| 스트레스 해소 | 클릭 횟수별 분노 게이지 + Canvas 파티클 |

---

## 5. 디렉토리 구조

```
rsai_ver1/
├── app/
│   ├── page.tsx                        # 메인 채팅 페이지 (Sidebar + ChatArea + InputArea)
│   ├── globals.css                     # 전역 CSS (Leaflet import 포함)
│   ├── api/
│   │   ├── chat/route.ts               # 채팅 SSE API (OpenAI + Gemini 통합)
│   │   ├── rag/
│   │   │   ├── query/route.ts          # RAG 질의응답
│   │   │   └── admin/
│   │   │       ├── categories/route.ts # 카테고리 CRUD
│   │   │       ├── upload/route.ts     # 문서 업로드 + 임베딩 (maxDuration: 300s)
│   │   │       └── documents/route.ts  # 문서 목록/삭제
│   │   └── work-support/
│   │       ├── report/route.ts
│   │       ├── greetings/route.ts
│   │       ├── merit-citation/route.ts
│   │       ├── press-release/route.ts
│   │       ├── scenario-generator/route.ts
│   │       ├── text-to-speech/route.ts
│   │       ├── ppt-converter/
│   │       │   ├── generate/route.ts
│   │       │   └── upload/route.ts
│   │       └── cadastral-map/route.ts  # V-World API 프록시
│   ├── work-support/                   # 업무도구 독립 페이지
│   └── fun/                            # FuN fUn 미니앱 페이지
│       ├── page.tsx                    # 허브 (다크/데이 모드 토글)
│       ├── mbti/, ladder/, lunch/
│       ├── countdown/, balance/, fortune/
│       ├── team/, dice/, rps/, stress/
│
├── lib/
│   ├── chat/                           # 메인 채팅 UI 컴포넌트
│   │   ├── Sidebar.tsx                 # 접이식 사이드바 (8종 단축키)
│   │   ├── ChatHeader.tsx              # 모델 배지 + 내보내기/초기화
│   │   ├── ChatArea.tsx                # 메시지 목록 + 웰컴 화면
│   │   ├── MessageBubble.tsx           # marked 마크다운 렌더링
│   │   └── InputArea.tsx              # 텍스트 입력 OR 업무도구 폼
│   ├── work-support/                   # 업무도구 UI (기능별 폴더 배치)
│   └── rag/
│       ├── db.ts                       # better-sqlite3 DB 초기화 + CRUD
│       ├── vectorCache.ts              # 모듈 레벨 임베딩 캐시
│       ├── RagView.tsx                 # RAG 메인 뷰 (갤러리/채팅/관리자)
│       └── admin/
│           ├── AdminView.tsx           # 문서 업로드/삭제 관리 UI
│           └── CategoryForm.tsx        # 카테고리 생성 폼
│
├── data/
│   ├── rag.db                          # SQLite RAG 데이터베이스
│   └── uploads/rag/                    # 업로드된 원본 파일
│
├── proxy.ts                            # 개발 프록시 설정 (구 middleware.ts)
├── ecosystem.config.js                 # PM2 프로세스 설정
├── next.config.ts                      # serverExternalPackages 설정
├── public/                             # 정적 파일
└── docs/                               # 설계 문서
    ├── project-overview.md             # 이 파일
    └── rag-design.md                   # RAG 시스템 상세 설계
```

---

## 6. API 설계 원칙

- 모든 API: `app/api/` 하위 `route.ts` (Next.js App Router Route Handler)
- 스트리밍: `ReadableStream` + `Content-Type: text/event-stream`
- Gemini: SDK 없이 REST API 직접 호출 (google-generativeai 패키지 미사용)
- 인증: 없음 (내부망 전용)
- 환경변수: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `VWORLD_API_KEY`
- 오류 응답: 항상 `NextResponse.json({ error: '...' }, { status: N })`

---

## 7. 주요 설계 결정

| 결정 | 이유 |
|------|------|
| App Router 전용 | 최신 Next.js 패턴, 레이아웃 공유, Route Handler |
| 전부 `use client` | 인터랙티브 UI 위주, SSR 불필요 |
| Inline CSS | 외부 CSS 없이 컴포넌트 자급자족, 동적 스타일 용이 |
| SQLite (better-sqlite3) | 외부 DB 없이 단일 파일로 RAG 운용, 내부망 적합 |
| Gemini REST | SDK 의존성 제거, 버전 관리 단순화 |
| Edge TTS | 무료 고품질 한국어 TTS, MS Azure 기반 |
| 기능별 폴더 배치 | `lib/work-support/보고서/` 식으로 UI+로직 함께 배치 |
| Canvas 애니메이션 | FuN fUn 우주/스파클 배경을 `requestAnimationFrame`으로 구현 |

---

## 8. 운영 환경 (서버 배포)

### 서버 스펙
- OS: Rocky Linux
- 웹서버: Nginx (리버스 프록시)
- 프로세스: PM2

### Nginx 핵심 설정
```nginx
server {
    client_max_body_size 100M;   # 대용량 파일 업로드 허용

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_read_timeout 300s;     # RAG 임베딩 처리 타임아웃
        proxy_send_timeout 300s;
    }
}
```

### 배포 절차
```bash
git pull
npm ci                    # 서버 OS에 맞게 네이티브 모듈 재컴파일
npm run build
pm2 restart all
```

> **주의**: `node_modules`를 통째로 복사하면 안 됨.
> `better-sqlite3`는 플랫폼별 네이티브 바이너리가 다르므로 반드시 서버에서 `npm ci` 실행.

---

## 9. 알려진 제약 / 주의사항

| 항목 | 내용 |
|------|------|
| 벡터 캐시 | 서버 메모리 저장 → PM2 재시작 시 초기화 (자동 재로드됨) |
| Nano Banana 제한 | 모듈 레벨 카운터 → PM2 재시작 시 초기화 |
| V-World 지오코딩 | `type=BOTH` 미지원 → road 먼저, 실패 시 parcel 폴백 |
| Edge TTS | `child_process.spawn('edge-tts')` → edge-tts CLI 서버에 설치 필요 |
| RAG 파일 저장 | `data/uploads/rag/` → 서버 디스크 공간 관리 필요 |
| better-sqlite3 | 서버리스(Vercel 등) 환경 미지원, VPS/베어메탈 전용 |

---

*최종 업데이트: 2026-03-03*
