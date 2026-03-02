# RAG 시스템 설계 문서

> 최초 작성: 2026-02-25 / 최종 업데이트: 2026-03-02
> 프로젝트: rsai_ver1 (Next.js 16 App Router)

---

## 0. 최종 목표 (Vision)

> **"담당자가 자기 업무를 하면서, 해당 분야 RAG 챗봇을 팝업 창 하나로 띄워두고 실시간으로 질의응답할 수 있는 환경"**

RAG 시스템의 궁극적 활용 형태는 전체 웹 페이지가 아닌 **경량 팝업 창**이다.

### 핵심 시나리오

| 상황 | 팝업 챗봇 |
|------|-----------|
| 야간 당직 중 | `당직 업무 매뉴얼` 팝업을 띄우고 상황 발생 시 즉시 질문 |
| 민원 응대 중 | `정보공개 처리 절차` 팝업으로 법령 근거 즉시 확인 |
| 예산 편성 작업 중 | `예산 지침` 팝업으로 지출 기준 조회 |
| 회의 자료 작성 중 | `보조금 규정` 팝업으로 지원 요건 확인 |

### 구현 원칙
- 웹 전체 페이지를 대체하지 않음 → **별도 팝업 창** (`window.open`)
- 팝업은 최소 UI만 포함 (사이드바·헤더 없음)
- 각 카테고리마다 독립된 팝업 URL: `/popup-chat/[categoryId]`
- 내부망 환경에서 여러 탭/창 동시 사용 가능

---

## 1. 개요

카테고리별 문서를 벡터 DB에 임베딩하고, 사용자 질문에 대해 관련 문서를 검색하여 AI가 답변하는 RAG(Retrieval-Augmented Generation) 시스템.

**카테고리는 완전 동적**: `categories.ts` 파일 없이 관리자 UI에서 생성/삭제. 코드 수정·재배포 없이 운영 중 카테고리 관리 가능.

### 진입 방식 (2가지)

1. **메인 웹앱 내 전환**: 사이드바 [Rag] 버튼 → 갤러리 → 카드 선택 → 채팅
2. **독립 팝업 창**: 갤러리 카드에서 [팝업으로 열기] 버튼 → `window.open('/popup-chat/[categoryId]')`

---

## 2. 화면 흐름

### 2-1. 메인 웹앱 흐름

```
사이드바 [Rag] 버튼 클릭
  └→ RagView (activeMode = 'rag')
       ├─ view: 'gallery'  → RagGallery   (카테고리 카드 + 관리자 버튼)
       ├─ view: 'chat'     → RagChat      (좌우 분할 채팅)
       └─ view: 'admin'    → AdminView    (문서 업로드/관리)
```

### 2-2. 팝업 창 흐름

```
RagGallery 카드에서 [팝업으로 열기] 클릭
  └→ window.open('/popup-chat/{categoryId}', '_blank', 'width=480,height=720,...')
       └→ PopupChatPage (app/popup-chat/[categoryId]/page.tsx)
            └→ PopupChat 컴포넌트 (경량 채팅 UI)
```

---

## 3. 갤러리 화면 (landing)

```
┌─────────────────────────────────────────────────────┐
│  🧠 RAG 지식 검색                    [관리자] [홈]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│   ┌───────────────┐  ┌───────────────┐              │
│   │  📋           │  │  🐾           │              │
│   │  정보공개     │  │  동물복지     │              │
│   │               │  │               │              │
│   │  문서 12개    │  │  문서 8개     │              │
│   │               │  │               │              │
│   │ [채팅 열기]   │  │ [채팅 열기]   │              │
│   │ [팝업으로 ↗] │  │ [팝업으로 ↗] │              │
│   └───────────────┘  └───────────────┘              │
│                                                     │
│   카드의 [팝업으로 ↗] 버튼을 누르면                 │
│   별도 창에서 해당 챗봇을 사용할 수 있습니다.        │
└─────────────────────────────────────────────────────┘
```

### 카드 버튼 동작

| 버튼 | 동작 |
|------|------|
| [채팅 열기] | 메인 앱 내 `view: 'chat'`으로 전환 |
| [팝업으로 ↗] | `window.open('/popup-chat/{id}', ...)` |

---

## 4. 채팅 화면 (메인 웹앱)

```
┌─────────────────────────────────────────────────────┐
│  [← 뒤로]  🐾 동물복지 RAG          [팝업으로 ↗]   │
├───────────────────────┬─────────────────────────────┤
│  📌 시스템 소개       │  💬 AI 답변                 │
│  이 카테고리는 동물   │                              │
│  복지 관련 법령 및    │  Q: 반려동물 학대 신고는?    │
│  정책 문서를 기반으로 │                              │
│  답변합니다.          │  A: 동물보호법 제8조에 따르  │
│  ─────────────────    │  면... [스트리밍 중]         │
│  📄 등록된 문서       │                              │
│  • 동물보호법.pdf     │                              │
│  • 복지지침2024.docx  │  ─────────────────────────  │
│  • 반려동물정책.pdf   │  [질문을 입력하세요...] [↑] │
└───────────────────────┴─────────────────────────────┘
```

> 헤더 우측에 [팝업으로 ↗] 버튼 → 채팅 도중에도 팝업 전환 가능

---

## 5. 팝업 채팅 화면 (독립 창)

```
┌─────────────────────────────────┐  ← 480px 내외
│  🐾 동물복지                [×] │  ← 카테고리명 + 닫기
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐    │
│  │  A: 동물보호법 제8조에  │    │
│  │  따르면 반려동물 학대를 │    │
│  │  목격했을 때는...       │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  Q: 신고 후 처리 기간은?│    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  A: 처리 기간은...      │    │
│  └─────────────────────────┘    │
│                                 │
│  📚 참고문서 [동물보호법.pdf]   │
│                                 │
├─────────────────────────────────┤
│  [질문을 입력하세요...    ] [↑] │
└─────────────────────────────────┘
```

### 팝업 창 사양

| 항목 | 값 |
|------|-----|
| 너비 | 480px |
| 높이 | 720px |
| 위치 | `left`, `top` (화면 우하단 기본) |
| 툴바 | 없음 (`toolbar=no,menubar=no`) |
| 리사이즈 | 가능 (`resizable=yes`) |
| URL | `/popup-chat/{categoryId}` |

### window.open 호출 예시

```typescript
function openPopupChat(categoryId: string, categoryName: string) {
  const w = 480, h = 720;
  const left = window.screen.width - w - 20;
  const top  = window.screen.height - h - 60;
  window.open(
    `/popup-chat/${categoryId}`,
    `rag-popup-${categoryId}`,   // 같은 카테고리는 같은 창 재사용
    `width=${w},height=${h},left=${left},top=${top},` +
    `toolbar=no,menubar=no,scrollbars=no,resizable=yes`
  );
}
```

> `window.open`의 두 번째 인자를 카테고리 ID로 고정하면, 같은 카테고리 팝업이 이미 열려있을 때 새 창을 열지 않고 기존 창으로 포커스 이동

---

## 6. 관리자 화면

```
┌─────────────────────────────────────────────────────┐
│  [← 뒤로]  ⚙️ RAG 관리자                            │
├─────────────┬───────────────────────────────────────┤
│             │  📋 정보공개                          │
│  📋 정보공개│  ┌────────────────────────────────┐   │
│  🐾 동물복지│  │  파일 선택 (PDF/DOCX/TXT)      │   │
│  💰 보조금  │  │  [파일 업로드 버튼]             │   │
│  ─────────  │  └────────────────────────────────┘   │
│  + 카테고리 │  문서 목록                (총 12개)    │
│    추가     │  ✅ 동물보호법.pdf     324청크  [삭제] │
│             │  ✅ 복지지침2024.docx  187청크  [삭제] │
│             │  ⏳ 정책문서.pdf        임베딩중...    │
│             │  ❌ 손상파일.pdf          오류  [삭제] │
└─────────────┴───────────────────────────────────────┘
```

**카테고리 추가 폼** (좌측 하단 [+ 카테고리 추가] 버튼 클릭 시 인라인 표시):

```
┌─────────────────────────┐
│  새 카테고리            │
│  이름: [____________]   │
│  아이콘: [📁] 색상: ●●●●●●●●  │
│  시스템 소개: [________] │
│  [저장]  [취소]         │
└─────────────────────────┘
```

각 카테고리 항목 우측에 🗑 삭제 버튼 (문서가 있으면 에러 메시지 표시)

---

## 7. 기술 스택

| 역할 | 기술 | 비고 |
|------|------|------|
| DB | `better-sqlite3` | 파일 기반, 서버 재시작 후 유지 |
| 임베딩 모델 | OpenAI `text-embedding-3-small` | 1,536차원 |
| 유사도 검색 | 코사인 유사도 (JS 직접 구현) | 추가 패키지 불필요 |
| 벡터 캐시 | 서버 모듈 레벨 Map | 쿼리 성능 최적화 |
| 청킹 | 500자 / 100자 오버랩 | 한국어 기준 |
| 스트리밍 | SSE (ReadableStream) | 기존 채팅과 동일 패턴 |
| 파일 파싱 | `pdf-parse`, `mammoth` | 이미 설치됨 |
| LLM | OpenAI GPT-4o-mini | RAG 컨텍스트 포함 답변 |
| 팝업 창 | `window.open` | 동일 카테고리 창 재사용 |

---

## 8. 파일 구조

```
app/
├── api/rag/
│   ├── query/route.ts              ← RAG 쿼리 (SSE 스트리밍)
│   └── admin/
│       ├── categories/route.ts     ← GET: 목록 / POST: 생성 / DELETE: 삭제
│       ├── upload/route.ts         ← POST: 파일 업로드 → 청킹 → 임베딩 → 저장
│       └── documents/route.ts      ← GET: 문서 목록 / DELETE: 문서 삭제
│
├── popup-chat/                     ← 팝업 전용 라우트 (새로 추가)
│   └── [categoryId]/
│       └── page.tsx                ← 경량 팝업 페이지 (헤더/사이드바 없음)

lib/rag/
├── db.ts                           ← SQLite 초기화 + CRUD 헬퍼 (카테고리 CRUD 포함)
├── vectorCache.ts                  ← 서버 메모리 벡터 캐시
├── RagView.tsx                     ← 진입점 (gallery/chat/admin 상태 관리)
├── RagGallery.tsx                  ← 카테고리 카드 갤러리 (팝업 버튼 포함)
├── RagChat.tsx                     ← 좌우 분할 채팅 화면
├── PopupChat.tsx                   ← 팝업 전용 경량 채팅 컴포넌트 (새로 추가)
└── admin/
    ├── AdminView.tsx               ← 관리자 레이아웃 + 카테고리 CRUD
    ├── CategoryForm.tsx            ← 카테고리 생성 폼 (이름/이모지/색상/설명)
    ├── DocumentManager.tsx         ← 우측 문서 목록 + 업로드
    └── FileUploader.tsx            ← 파일 업로드 컴포넌트

data/                               ← gitignore
├── rag.db                          ← SQLite DB 파일 (카테고리 포함)
└── uploads/rag/                    ← 업로드 원본 파일 저장
    └── {categoryId}/               ← UUID 기반 카테고리 ID 폴더
```

---

## 9. DB 스키마

```sql
-- 카테고리 (관리자 UI에서 동적으로 생성/삭제 — 코드에 하드코딩 없음)
CREATE TABLE categories (
  id          TEXT PRIMARY KEY,   -- crypto.randomUUID() 서버 생성
  name        TEXT NOT NULL,      -- '정보공개' (관리자 입력)
  icon        TEXT NOT NULL,      -- '📋' (이모지 직접 입력)
  description TEXT,               -- 시스템 소개 (관리자 입력)
  color       TEXT,               -- '#3b82f6' (프리셋 8종 중 선택)
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 업로드 문서 메타데이터
CREATE TABLE documents (
  id            TEXT PRIMARY KEY,  -- UUID
  category_id   TEXT NOT NULL REFERENCES categories(id),
  original_name TEXT NOT NULL,     -- '동물보호법.pdf'
  file_path     TEXT NOT NULL,     -- 실제 저장 경로
  file_size     INTEGER,
  status        TEXT DEFAULT 'pending',  -- pending | processing | done | error
  error_message TEXT,
  chunk_count   INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 청크 + 임베딩
CREATE TABLE chunks (
  id          TEXT PRIMARY KEY,   -- UUID
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  chunk_text  TEXT NOT NULL,
  embedding   TEXT NOT NULL,      -- JSON 배열 '[0.1, 0.2, ...]'
  chunk_index INTEGER NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chunks_category ON chunks(category_id);
CREATE INDEX idx_documents_category ON documents(category_id);
```

---

## 10. API 설계

### POST `/api/rag/query` — RAG 쿼리 (SSE)

**Request Body:**
```json
{
  "categoryId": "animal-welfare",
  "question": "반려동물 학대 신고 방법은?",
  "history": [
    { "role": "user", "content": "이전 질문" },
    { "role": "assistant", "content": "이전 답변" }
  ]
}
```

> 메인 웹앱과 팝업 창이 **동일한 API 엔드포인트** 사용 (팝업 전용 API 불필요)

**처리 흐름:**
1. 질문을 `text-embedding-3-small`로 임베딩
2. 해당 카테고리 벡터 캐시에서 코사인 유사도 계산 → top-5 청크 추출
3. 시스템 프롬프트 + 컨텍스트 + 대화 이력 → GPT-4o-mini로 전송
4. SSE로 실시간 스트리밍 응답

**SSE Response:**
```
data: {"type":"chunk","content":"동물보호법 제8조에"}
data: {"type":"chunk","content":" 따르면..."}
data: {"type":"sources","sources":[{"docName":"동물보호법.pdf","chunk":"..."}]}
data: {"type":"done"}
```

---

### POST `/api/rag/admin/upload` — 파일 업로드

**Request:** `multipart/form-data`
```
file: File (PDF/DOCX/TXT)
categoryId: string
```

**처리 흐름:**
1. 파일 저장 (`data/uploads/rag/{categoryId}/`)
2. DB에 document 레코드 생성 (status: 'pending')
3. 즉시 응답 반환 (document id)
4. 백그라운드에서 비동기 처리:
   - 텍스트 추출 (pdf-parse / mammoth)
   - 500자 청킹 (100자 오버랩)
   - OpenAI 임베딩 (배치 처리)
   - DB chunks 저장
   - status → 'done' 업데이트
   - 벡터 캐시 무효화

**Response:**
```json
{ "documentId": "uuid", "status": "processing" }
```

---

### GET `/api/rag/admin/categories`

**Response:**
```json
{
  "categories": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "동물복지",
      "icon": "🐾",
      "color": "#10b981",
      "description": "동물보호법, 복지 규정, 정책 기반 AI 상담",
      "document_count": 8,
      "chunk_count": 1240
    }
  ]
}
```

---

### POST `/api/rag/admin/categories` — 카테고리 생성

**Request Body:**
```json
{
  "name": "동물복지",
  "icon": "🐾",
  "color": "#10b981",
  "description": "동물보호법, 복지 규정, 정책 기반 AI 상담"
}
```

**처리 흐름:**
1. 필수값(name, icon, color) 검증
2. `crypto.randomUUID()` 로 id 생성
3. DB INSERT
4. 생성된 카테고리 반환

**Response (201):**
```json
{ "category": { "id": "uuid", "name": "동물복지", ... } }
```

---

### DELETE `/api/rag/admin/categories?id={categoryId}` — 카테고리 삭제

**처리 흐름:**
1. 해당 카테고리에 문서가 있으면 **400 오류** 반환
2. 문서가 없으면 DB DELETE

```json
// 문서 있을 때 400
{ "error": "문서를 먼저 삭제해주세요." }

// 성공
{ "success": true }
```

---

## 11. 팝업 페이지 구현 (`app/popup-chat/[categoryId]/page.tsx`)

```typescript
// 팝업 전용 페이지 — Next.js layout 적용 제외 (별도 layout.tsx 또는 루트 layout에서 분기)
// 헤더, 사이드바, 네비게이션 없음

export default async function PopupChatPage({
  params
}: {
  params: Promise<{ categoryId: string }>
}) {
  const { categoryId } = await params;
  // 카테고리 정보를 서버에서 조회해서 전달
  return <PopupChat categoryId={categoryId} />;
}
```

### PopupChat 컴포넌트 (`lib/rag/PopupChat.tsx`)

- `RagChat.tsx`와 동일한 SSE 스트리밍 로직 공유
- 좌측 문서 목록 패널 없음 (채팅 영역만)
- 최소 스타일: 흰 배경, 카테고리명 헤더, 입력창
- 대화 이력은 `useState`로 관리 (창 닫으면 초기화)

### 팝업 레이아웃 분리

```typescript
// app/popup-chat/layout.tsx
// 루트 layout의 사이드바/헤더를 포함하지 않는 별도 레이아웃
export default function PopupLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: 'system-ui' }}>
        {children}
      </body>
    </html>
  );
}
```

---

## 12. 카테고리 관리 방법

**코드 수정 없이 관리자 UI에서 바로 추가/삭제 가능.**

### 카테고리 추가
1. 사이드바 → Rag → [관리자] 클릭
2. 좌측 하단 **[+ 카테고리 추가]** 버튼 클릭
3. 이름, 아이콘(이모지), 색상(8종 프리셋), 시스템 소개 입력
4. [저장] → 즉시 갤러리에 카드 표시 + 팝업 URL 자동 활성화

### 색상 프리셋

| 색상 | 코드 |
|------|------|
| 파랑 | `#3b82f6` |
| 초록 | `#10b981` |
| 노랑 | `#f59e0b` |
| 빨강 | `#ef4444` |
| 보라 | `#8b5cf6` |
| 핑크 | `#ec4899` |
| 하늘 | `#06b6d4` |
| 주황 | `#f97316` |

### 카테고리 삭제
- 해당 카테고리의 **문서를 모두 삭제** 후 🗑 버튼 클릭
- 문서가 남아있으면 "문서를 먼저 삭제해주세요" 에러 표시

### 카테고리 ID
- 서버에서 `crypto.randomUUID()` 자동 생성
- 팝업 URL: `/popup-chat/{UUID}` 형태로 고정
- 변경 불가 (문서/청크/팝업 URL의 외래키로 사용됨)

---

## 13. 벡터 캐시 전략

```typescript
// lib/rag/vectorCache.ts

interface CacheEntry {
  embedding: number[];
  chunkText: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
}

// 카테고리별 캐시: 서버 모듈 레벨 (재시작 전까지 유지)
const cache = new Map<string, CacheEntry[]>();

// 무효화 조건: 문서 추가 / 삭제 시
export function invalidateCache(categoryId: string) {
  cache.delete(categoryId);
}

// 조회: 없으면 DB에서 로드 후 캐싱
export async function getCategoryVectors(categoryId: string): Promise<CacheEntry[]> {
  if (!cache.has(categoryId)) {
    const rows = db.getAllChunks(categoryId);
    cache.set(categoryId, rows);
  }
  return cache.get(categoryId)!;
}
```

---

## 14. 청킹 전략

```
원본 텍스트
  → 줄바꿈/단락 기준 1차 분리
  → 500자 초과 시 슬라이딩 윈도우 분할 (오버랩 100자)
  → 너무 짧은 청크(50자 미만) 제거 또는 앞 청크에 합치기
  → 청크에 문서명 prefix 추가: "[동물보호법.pdf] {내용}"
```

---

## 15. 시스템 프롬프트 (RAG)

```
당신은 {categoryName} 전문 AI 상담사입니다.
아래의 참고 문서를 바탕으로 사용자의 질문에 정확하게 답변하세요.

[참고 문서]
{context}

규칙:
1. 참고 문서에 없는 내용은 "해당 내용은 등록된 문서에서 찾을 수 없습니다"라고 답하세요.
2. 답변 시 근거 문서를 명시하세요 (예: "동물보호법 제8조에 따르면...")
3. 한국어로 답변하세요.
```

---

## 16. 사이드바 연동

```typescript
// lib/chat/Sidebar.tsx
export type ToolId = '...' | 'rag';  // ToolId에 'rag' 추가

export const TOOLS: Tool[] = [
  // 기존 도구들...
  { id: 'rag', label: 'Rag', icon: '🧠', description: '문서 기반 AI 답변' },
];

// app/page.tsx
{activeMode === 'rag' ? (
  <RagView onClose={() => setActiveMode(null)} />
) : activeMode === 'templates' ? (
  <TemplateView onClose={() => setActiveMode(null)} />
) : (
  // 기존 채팅 영역
)}
```

---

## 17. 구현 단계

| 단계 | 내용 | 파일 | 상태 |
|------|------|------|------|
| 1 | 패키지 설치 + next.config.ts 업데이트 | `better-sqlite3` | ✅ |
| 2 | DB 초기화 + 카테고리 CRUD 헬퍼 | `lib/rag/db.ts` | ✅ |
| 3 | 관리자 API (카테고리/업로드/문서) | `app/api/rag/admin/` | ✅ |
| 4 | 관리자 UI + 카테고리 생성 폼 | `lib/rag/admin/` | ✅ |
| 5 | RAG 쿼리 API (SSE) | `app/api/rag/query/` | ✅ |
| 6 | 채팅 UI | `lib/rag/RagChat.tsx` | ✅ |
| 7 | 갤러리 + 진입점 | `lib/rag/RagView.tsx`, `RagGallery.tsx` | ✅ |
| 8 | 사이드바 연동 | `Sidebar.tsx`, `page.tsx` | ✅ |
| 9 | 카테고리 동적화 (categories.ts 제거) | `db.ts`, `AdminView.tsx`, `CategoryForm.tsx` | ✅ |
| 10 | 갤러리에 [팝업으로 ↗] 버튼 추가 | `RagGallery.tsx` | 예정 |
| 11 | 팝업 전용 레이아웃 | `app/popup-chat/layout.tsx` | 예정 |
| 12 | PopupChat 컴포넌트 | `lib/rag/PopupChat.tsx` | 예정 |
| 13 | 팝업 페이지 라우트 | `app/popup-chat/[categoryId]/page.tsx` | 예정 |

---

## 18. 주의사항 / 제약

- `better-sqlite3`는 네이티브 모듈 → `serverExternalPackages`에 추가 필요
- 파일 업로드는 Next.js 기본 4MB 제한 → `next.config.ts`에서 `api.bodyParser` 설정 필요 (또는 `formData` 사용)
- 임베딩 처리는 시간이 걸릴 수 있으므로 백그라운드 처리 + 상태 폴링
- `data/` 폴더는 `.gitignore`에 추가
- OpenAI 임베딩 비용: `text-embedding-3-small` 기준 $0.02 / 1M tokens (매우 저렴)
- 카테고리 삭제 시 문서/청크는 자동 삭제되지 않음 → 문서를 먼저 삭제해야 카테고리 삭제 가능
- 카테고리 ID는 UUID → 업로드 파일 경로가 `data/uploads/rag/{UUID}/` 형태
- **팝업 창**: 내부망(인트라넷) 환경에서는 `window.open` 팝업 차단 설정 여부 사전 확인 필요
- **팝업 레이아웃**: `app/popup-chat/layout.tsx`를 반드시 분리해야 루트 layout의 사이드바·헤더가 팝업에 들어오지 않음

---

## 19. 저장 구조

### 문서 업로드 → 저장 흐름

```
[동물보호법.pdf] (32KB, 15페이지)
       │
       ▼  텍스트 추출 (pdf-parse)
[원본 텍스트 전체 약 28,000자]
       │
       ▼  500자 청킹 (100자 오버랩)
  청크 0: "제1조(목적) 이 법은 동물에 대한 학대행위의 방지 등 동물을 적정하게 보호·관리하기 위하여..."  (500자)
  청크 1: "...적정하게 보호·관리하기 위하여 필요한 사항을 규정함으로써 동물의 생명보호, 안전 보장 및..."  (500자, 앞 100자 중복)
  청크 2: ...
  ...
  청크 N: (마지막, 500자 미만 가능)
       │
       ▼  OpenAI 임베딩 배치 처리 (text-embedding-3-small)
  각 청크 → 1,536차원 float 배열
       │
       ▼  SQLite INSERT
```

---

## 20. 질문 시 검색 과정

```
사용자: "반려동물 학대 신고 방법은?"
        │
        ▼  Step 1: 질문 임베딩
  POST https://api.openai.com/v1/embeddings
  { model: "text-embedding-3-small", input: "반려동물 학대 신고 방법은?" }
  → queryEmbedding: [0.0234, 0.0891, -0.0345, ...] (1,536차원)
        │
        ▼  Step 2: 벡터 캐시 로드 (없으면 DB에서)
  getCategoryVectors("animal-welfare")
  → allChunks: [ {embedding, chunkText, docName, ...}, ... ]  (예: 500개)
        │
        ▼  Step 3: 코사인 유사도 전체 계산
  allChunks.map(c => ({
    ...c,
    score: cosineSimilarity(queryEmbedding, c.embedding)
  }))
        │
        ▼  Step 4: Top-5 정렬 추출
  .sort((a, b) => b.score - a.score).slice(0, 5)
        │
        ▼  Step 5: 컨텍스트 구성 → GPT-4o-mini 호출 (SSE 스트리밍)
```

### 코사인 유사도 계산 (JS 구현)

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
// 반환값 범위: -1 ~ 1  (1에 가까울수록 유사)
// 실제 유사 청크: 보통 0.7 이상
```
