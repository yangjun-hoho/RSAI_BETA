# HWPX 문서 자동화 시스템 - 실구현 설계 문서 (v2)

> **작성 기준**: 실제 구현된 코드 기반으로 작성한 설계 문서
> **구현 위치**: `rsai_beta` 프로젝트 `/work-support2/report`
> **작성일**: 2026-03-21

---

## 목차

1. [전체 아키텍처](#1-전체-아키텍처)
2. [기술 스택](#2-기술-스택)
3. [핵심 설계 원칙](#3-핵심-설계-원칙)
4. [노드 타입 시스템](#4-노드-타입-시스템)
5. [폴더 구조](#5-폴더-구조)
6. [템플릿 시스템](#6-템플릿-시스템)
7. [AI 연동 설계](#7-ai-연동-설계)
8. [HWPX 렌더러](#8-hwpx-렌더러)
9. [프론트엔드](#9-프론트엔드)
10. [백엔드 API](#10-백엔드-api)
11. [데이터 흐름](#11-데이터-흐름)
12. [새 템플릿 추가 방법](#12-새-템플릿-추가-방법)
13. [알려진 이슈 및 해결 이력](#13-알려진-이슈-및-해결-이력)

---

## 1. 전체 아키텍처

```
┌────────────────────────────────────────────────────────────┐
│                       사용자 브라우저                        │
│                                                            │
│  [템플릿 선택] → [입력폼] → [문서 생성] → [미리보기] → [HWP 다운로드] │
└──────────────────────────┬─────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼─────────────────────────────────┐
│              Next.js 16 App Router (rsai_beta)              │
│                                                            │
│  ┌─────────────────┐     ┌─────────────────────────────┐   │
│  │   Frontend      │     │   API Routes (Node.js)      │   │
│  │   (React/TSX)   │     │                             │   │
│  │                 │     │  /api/work-support2/report/ │   │
│  │  TemplateSelector    │  ├── templates/route.ts      │   │
│  │  DynamicForm    │     │  ├── generate/route.ts      │   │
│  │  PreviewPanel   │     │  └── render/route.ts        │   │
│  │  DownloadButton │     │                             │   │
│  └─────────────────┘     └──────────────┬──────────────┘   │
└─────────────────────────────────────────┼──────────────────┘
                                          │
              ┌───────────────────────────┼──────────────┐
              │                           │              │
   ┌──────────▼──────────┐    ┌───────────▼───────────┐  │
   │   OpenAI API        │    │   템플릿 파일 시스템    │  │
   │   gpt-4.1-mini      │    │   /templates/          │  │
   │                     │    │   └── report_basic/    │  │
   │  JSON nodes 배열 반환│    │       ├── template.hwpx│  │
   └─────────────────────┘    │       ├── definition.json│ │
                              │       └── form_schema.json│ │
                              └───────────────────────────┘
```

---

## 2. 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| 프레임워크 | Next.js 16 (App Router) | webpack 모드 (`--webpack` 플래그) |
| 언어 | TypeScript | `/types/work-support2/index.ts` |
| 스타일링 | Tailwind CSS v4 (`@tailwindcss/postcss`) | postcss.config.mjs |
| AI | OpenAI API (`gpt-4.1-mini`) | Claude 키 없음, GPT 사용 |
| HWPX 처리 | JSZip | ZIP 조작, Node.js 순수 구현 |
| 보안 | piiFilter, auditLog, inputValidation | 기존 보안 모듈 재사용 |
| 인증 | AUTH_SECRET (JWT) | `.env` 필수 |

> **주의**: Turbopack(`--turbopack`)은 `@tailwindcss/postcss`와 충돌 이슈 있음.
> `opts.from` 미전달 버그로 tailwindcss 패키지 resolve 실패.
> **해결책**: `package.json` dev 스크립트에서 `--webpack` 사용.

---

## 3. 핵심 설계 원칙

### 원칙 1: 템플릿 추가 = 코어 코드 수정 없음

새 템플릿 추가 시 `/templates/{id}/` 폴더에 파일 3개만 추가하면 된다.

```
할 일:
1. /templates/{template_id}/ 폴더 생성
2. template.hwpx 제작 (한글 프로그램에서 CONTENT_ANCHOR 삽입)
3. definition.json 작성
4. form_schema.json 작성
→ 코어 코드(renderer, validator, API) 수정 없음
```

### 원칙 2: 노드 타입 고정, 조합은 가변

AI가 생성하는 nodes 배열은 6가지 고정 타입을 자유롭게 조합한다.
렌더러는 타입별 스타일을 `definition.json`의 `style_map`에서 읽어 적용한다.

### 원칙 3: 플랫 배열 구조

트리 구조 없이 순서 있는 1차원 배열. 렌더러가 위에서부터 순서대로 읽어 처리.

### 원칙 4: 기호·번호는 렌더러가 자동 추가

AI는 content에 `○`, `-`, 번호(`1.`, `1-1`) 절대 포함하지 않음.
렌더러와 미리보기가 노드 타입에 따라 자동으로 기호 추가.

---

## 4. 노드 타입 시스템

### 타입 정의 (`/types/work-support2/index.ts`)

```typescript
export type NodeType = 'TITLE' | 'BACKGROUND' | 'SECTION' | 'SUBSECTION' | 'SUB_DETAIL' | 'BULLET';

export interface DocumentNode {
  type: NodeType;
  content: string;
}
```

### 타입별 역할 및 렌더링

| 노드 타입 | HWP 스타일 | 미리보기 기호 | HWP 기호 | 들여쓰기 | paraPrIDRef |
|-----------|-----------|-------------|---------|---------|------------|
| `TITLE` | 문서 제목 (25pt) | 없음 | 템플릿 제목 교체 | 없음 | 2 (CENTER) |
| `BACKGROUND` | 배경 요약문 | 없음 | 없음 | 없음 | 20 (JUSTIFY) |
| `SECTION` | 섹션 헤더 테이블 | `[SECTION]` | 번호셀+제목셀 테이블 | 없음 | - |
| `SUBSECTION` | ○ 항목 | `○ ` | `○ ` | 1단계 (850) | 31 |
| `SUB_DETAIL` | - 항목 | `- ` | `- ` | 2단계 (2268) | 32 |
| `BULLET` | · 항목 | `· ` | `· ` | 2단계 (2268) | 32 |

### SECTION 렌더링 - 번호 테이블

```
┌───┬────────────────────────────────┐
│ 1 │  섹션 제목                      │  ← 어두운 회색 배경 번호 | 연회색 배경 제목
└───┴────────────────────────────────┘
  charPrIDRef=9 (흰색)  charPrIDRef=10 (검정)
  borderFillIDRef=7     borderFillIDRef=8
```

SECTION 번호는 렌더러가 sectionCounter를 증가시키며 자동 부여.

### 노드 배열 예시

```json
{
  "nodes": [
    { "type": "TITLE",      "content": "2025년 AI 도입 추진 계획" },
    { "type": "BACKGROUND", "content": "디지털 전환 가속화에 따라 AI 기술 도입이 시급히 요구되고 있다." },
    { "type": "SECTION",    "content": "추진 배경 및 필요성" },
    { "type": "SUBSECTION", "content": "현황 분석" },
    { "type": "SUB_DETAIL", "content": "지역 내 디지털 인프라 현황 검토" },
    { "type": "BULLET",     "content": "AI 도입을 위한 정책적 지원 필요성" },
    { "type": "SECTION",    "content": "세부 추진 계획" },
    { "type": "SUBSECTION", "content": "단계별 추진 일정" },
    { "type": "SUB_DETAIL", "content": "1단계(2025.01~06): 파일럿 사업 추진" }
  ]
}
```

---

## 5. 폴더 구조

실제 구현된 파일 기준:

```
rsai_beta/
│
├── app/
│   ├── work-support2/
│   │   ├── page.tsx                    # 업무지원2 랜딩페이지 (카드 그리드)
│   │   └── report/
│   │       └── page.tsx                # 보고서 생성 메인 페이지
│   │
│   └── api/work-support2/report/
│       ├── templates/route.ts          # GET: 템플릿 목록, GET?id=: 폼 스키마
│       ├── generate/route.ts           # POST: AI nodes 생성
│       └── render/route.ts             # POST: HWPX 파일 생성 반환
│
├── lib/work-support2/report/
│   ├── templateRegistry.ts             # 템플릿 폴더 스캔 및 파일 로드
│   ├── promptBuilder.ts                # definition.json → OpenAI 프롬프트 생성
│   ├── nodesValidator.ts               # nodes 배열 유효성 검증
│   ├── hwpxRenderer.ts                 # nodes + template.hwpx → output.hwpx
│   └── components/
│       ├── TemplateSelector.tsx        # 템플릿 선택 UI (API에서 목록 fetch)
│       ├── DynamicForm.tsx             # form_schema.json 기반 자동 폼 렌더링
│       ├── PreviewPanel.tsx            # nodes 배열 → HTML 미리보기
│       └── DownloadButton.tsx          # render API 호출 → Blob 다운로드
│
├── templates/                          # ← 개발자 확장 포인트
│   └── report_basic/
│       ├── template.hwpx               # 남양주시 공문 양식 (CONTENT_ANCHOR 포함)
│       ├── definition.json             # 템플릿 정의
│       └── form_schema.json            # 입력폼 필드 정의
│
├── types/work-support2/
│   └── index.ts                        # 공통 TypeScript 타입
│
└── scripts/
    └── create-report-template.cjs      # template.hwpx 최초 생성 스크립트
```

---

## 6. 템플릿 시스템

### 6-1. definition.json

실제 `report_basic` 정의:

```json
{
  "id": "report_basic",
  "name": "기본 업무보고서",
  "description": "일반적인 업무 보고에 사용하는 양식",
  "version": "1.0.0",
  "allowed_node_types": ["TITLE", "BACKGROUND", "SECTION", "SUBSECTION", "SUB_DETAIL", "BULLET"],
  "node_rules": {
    "TITLE":      { "required": true,  "min": 1, "max": 1  },
    "BACKGROUND": { "required": false, "min": 0, "max": 1  },
    "SECTION":    { "required": true,  "min": 1, "max": 10 },
    "SUBSECTION": { "required": false, "min": 0, "max": 20 },
    "SUB_DETAIL": { "required": false, "min": 0, "max": 30 },
    "BULLET":     { "required": false, "min": 0, "max": 50 }
  },
  "style_map": {
    "TITLE":      { "charPrIDRef": "20", "paraPrIDRef": "2",  "styleIDRef": "0"  },
    "BACKGROUND": { "charPrIDRef": "22", "paraPrIDRef": "20", "styleIDRef": "0"  },
    "SECTION":    "section_table",
    "SUBSECTION": { "charPrIDRef": "23", "paraPrIDRef": "31", "styleIDRef": "31" },
    "SUB_DETAIL": { "charPrIDRef": "24", "paraPrIDRef": "32", "styleIDRef": "32" },
    "BULLET":     { "charPrIDRef": "24", "paraPrIDRef": "32", "styleIDRef": "32" }
  },
  "anchor_id": "CONTENT_ANCHOR",
  "ai_instructions": "공식 업무보고서 형식으로 작성하세요..."
}
```

**style_map 특이사항**:
- `SECTION`은 `"section_table"` 문자열 → 렌더러가 2셀 테이블 빌더로 분기
- 나머지는 `{ charPrIDRef, paraPrIDRef, styleIDRef }` 객체

**HWPX style ID 참조표** (header.xml 기반, 변경 금지):

| charPrIDRef | 설명 |
|------------|------|
| 9 | 섹션 번호 (16pt, 흰색 #FFFFFF) |
| 10 | 섹션 제목 (16pt, 검정) |
| 20 | 문서 제목 (25pt, 자간 0) |
| 22 | 배경 요약문 (14pt) |
| 23 | ○ 항목 (15pt) |
| 24 | - · 항목 (14pt) |

| paraPrIDRef | 설명 |
|------------|------|
| 2 | CENTER 정렬 |
| 14 | LEFT 정렬 |
| 20 | JUSTIFY |
| 31 | ○ 항목 단락 (horzpos=850) |
| 32 | - · 항목 단락 (horzpos=2268) |

| borderFillIDRef | 설명 |
|----------------|------|
| 7 | 섹션 번호 셀 배경 #505457 (진회색) |
| 8 | 섹션 제목 셀 배경 #E6E6E7 (연회색) |

### 6-2. form_schema.json

```json
{
  "fields": [
    { "id": "title",            "label": "문서 제목",     "type": "text",     "required": true },
    { "id": "core_content",     "label": "핵심 내용",     "type": "textarea", "required": true },
    { "id": "include_background","label": "배경 섹션 포함", "type": "toggle",   "default": true },
    { "id": "section_depth",    "label": "문서 깊이",     "type": "select",
      "options": ["AI 자동", "섹션만", "섹션+소제목", "섹션+소제목+세부항목"],
      "default": "AI 자동" }
  ]
}
```

지원 field type: `text`, `textarea`, `toggle`, `select`

### 6-3. template.hwpx 제작 규칙

1. 한글(HWP) 프로그램에서 기관 로고, 담당자 정보 등 고정 헤더 구성
2. 제목 텍스트에 `charPrIDRef=20` 스타일 적용 (렌더러가 TITLE 노드로 교체)
3. 본문 시작 위치에 `CONTENT_ANCHOR` 텍스트가 있는 단락 삽입
   → 렌더러가 이 단락을 찾아 generated XML로 교체
4. `scripts/create-report-template.cjs`로 기존 hwpx에서 자동 추출 가능

**자간(letterSpacing) 주의**:
`charPrIDRef=20` (제목)의 자간은 header.xml의 `<hh:spacing>` 속성으로 제어.
`report_basic/template.hwpx`는 자간=0으로 수정 완료.

---

## 7. AI 연동 설계

### 7-1. 사용 모델

- 모델: `gpt-4.1-mini`
- 온도: `0.7`
- max_completion_tokens: `8000`
- 재시도: 최대 3회 (JSON 파싱 실패 또는 validation 실패 시)

### 7-2. 프롬프트 구조

**System Prompt** (`promptBuilder.ts`):

```
역할: 10년 경력 지방자치단체 공문서 작성 전문가
허용 노드 타입: {allowed_node_types}

노드 구조 규칙:
- nodes[0]: TITLE (1개)
- BACKGROUND: 2~3문장 배경 (1개)
- SECTION: 3~5개
- SUBSECTION: 각 섹션당 2~3개
- SUB_DETAIL: 각 SUBSECTION당 2~4개 (수치·기간·근거 포함)
- 전체 노드 수: 20개 이상

content 형식 규칙:
- 번호(1., 1-1)와 기호(○, -, •) 절대 포함 금지
- 구체적 수치·기간·정책명 적극 활용

{ai_instructions (definition.json에서 주입)}
```

**User Prompt** (`promptBuilder.ts`):

```
문서 제목: {title}
핵심 내용: {core_content}
배경 섹션: 포함/미포함
문서 깊이: AI 자동 | 섹션만 | ...
```

### 7-3. 응답 파싱

```typescript
// 마크다운 코드블록 제거
const cleaned = raw
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/```\s*$/i, '')
  .trim();

const parsed: { nodes: DocumentNode[] } = JSON.parse(cleaned);
```

---

## 8. HWPX 렌더러

**파일**: `lib/work-support2/report/hwpxRenderer.ts`

### 8-1. 렌더링 흐름

```
templateBuffer (Buffer)
    ↓ JSZip.loadAsync()
    ↓ Contents/section0.xml 읽기
    ↓ TITLE 노드 → charPrIDRef=20 텍스트 교체 (regex)
    ↓ CONTENT_ANCHOR 단락 위치 탐색
    ↓ TITLE 제외 나머지 노드 → XML 생성
    ↓ CONTENT_ANCHOR 단락 대체
    ↓ zip.generateAsync({ type: 'nodebuffer' })
    → output Buffer
```

### 8-2. 노드별 XML 생성

| 노드 타입 | 생성 함수 | 결과 XML |
|-----------|----------|---------|
| TITLE | 템플릿 텍스트 직접 교체 | `<hp:run charPrIDRef="20">` |
| BACKGROUND | `buildBackgroundPara()` | 1셀 `<hp:tbl>` (상하 테두리 박스) |
| SECTION | `buildSectionTable()` | 2셀 `<hp:tbl>` (번호+제목) |
| SUBSECTION | `buildBulletPara('○')` | `<hp:p paraPrIDRef="31">` |
| SUB_DETAIL | `buildSubBulletPara('-')` | `<hp:p paraPrIDRef="32">` |
| BULLET | `buildSubBulletPara('·')` | `<hp:p paraPrIDRef="32">` |

### 8-3. BACKGROUND 테이블 구조

BACKGROUND는 단순 단락이 아닌 **상하 테두리 박스** (1행 1열 테이블):

```xml
<hp:p paraPrIDRef="29">
  <hp:tbl rowCnt="1" colCnt="1" borderFillIDRef="3">
    <!-- 셀: 상하 테두리만 (#505457), 채움 없음 -->
    <hp:tc borderFillIDRef="14">
      <hp:p paraPrIDRef="30">
        <hp:run charPrIDRef="22">{content}</hp:run>
      </hp:p>
    </hp:tc>
  </hp:tbl>
</hp:p>
```

- `borderFillIDRef="14"`: 상·하 테두리 #505457, 채움 없음
- `charPrIDRef="22"`: 요약문 스타일 (14pt)
- `paraPrIDRef="29"/"30"`: 외곽/내부 단락 스타일

### 8-4. SECTION 테이블 구조

```xml
<hp:tbl rowCnt="1" colCnt="2" borderFillIDRef="3">
  <!-- 번호 셀 (진회색 배경) -->
  <hp:tc borderFillIDRef="7" width="2834">
    <hp:run charPrIDRef="9">{sectionCounter}</hp:run>
  </hp:tc>
  <!-- 제목 셀 (연회색 배경) -->
  <hp:tc borderFillIDRef="8" width="44787">
    <hp:run charPrIDRef="10">{title}</hp:run>
  </hp:tc>
</hp:tbl>
```

### 8-4. ID 충돌 방지

```typescript
private tblIdBase = (Date.now() % 900000000) + 100000000; // 9자리 양수
private tblIdCounter = 0;
private zOrderCounter = 2; // 헤더 테이블이 0 사용 → 2부터 시작
```

---

## 9. 프론트엔드

### 9-1. 페이지 구조 (`app/work-support2/report/page.tsx`)

```
┌────────────────────────────────────────────────────────┐
│  좌측 패널 (380px)          │  우측 패널 (flex: 1)       │
│                            │                           │
│  TemplateSelector          │  헤더 (미리보기 + 다운로드) │
│  DynamicForm               │                           │
│  [문서 생성] 버튼           │  PreviewPanel             │
│  에러 메시지                │                           │
└────────────────────────────────────────────────────────┘
```

### 9-2. 컴포넌트 역할

**TemplateSelector**: `/api/work-support2/report/templates` fetch → 템플릿 목록 버튼 렌더링

**DynamicForm**: `form_schema.json`의 fields 배열 순회하여 자동 렌더링
- `text` → `<input>`
- `textarea` → `<textarea>`
- `toggle` → `<input type="checkbox">`
- `select` → `<select>`

**PreviewPanel**: nodes 배열 순회 → `NODE_PREFIX` 맵으로 기호 추가
```typescript
const NODE_PREFIX = {
  SUBSECTION: '○ ',
  SUB_DETAIL: '- ',
  BULLET:     '· ',
};
```

**DownloadButton**: `/api/work-support2/report/render` POST → Blob → `<a>` download

### 9-3. 랜딩페이지 (`app/work-support2/page.tsx`)

`work-support/page.tsx`와 동일한 카드 그리드 구조.
사이드바 SHORTCUTS에 `{ id: 'work-support2', label: '업무지원2', icon: '⚡', path: '/work-support2' }` 추가됨.

---

## 10. 백엔드 API

### GET `/api/work-support2/report/templates`

- 파라미터 없음: 템플릿 목록 반환 `[{ id, name, description }]`
- `?id={templateId}`: 해당 템플릿의 `form_schema` 반환

### POST `/api/work-support2/report/generate`

**요청**:
```json
{ "templateId": "report_basic", "formData": { "title": "...", "core_content": "..." } }
```

**처리 순서**:
1. PII 필터 (title + core_content)
2. 입력 길이 검증 (title ≤ 200, core_content ≤ 2000)
3. 감사 로그 기록
4. `getDefinition()` → `buildSystemPrompt()` + `buildUserPrompt()`
5. OpenAI API 호출 (최대 3회 재시도)
6. JSON 파싱 → `validateNodes()`
7. 유효 시 `{ nodes }` 반환

**응답**:
```json
{ "nodes": [{ "type": "TITLE", "content": "..." }, ...] }
```

### POST `/api/work-support2/report/render`

**요청**:
```json
{ "templateId": "report_basic", "nodes": [...] }
```

**처리 순서**:
1. `validateNodes()` 재검증
2. `getTemplatePath()` → `fs.readFileSync()` → Buffer
3. `new HWPXRenderer().render(buffer, nodes, def)`
4. `Content-Type: application/hwp+zip` + `Content-Disposition: attachment` 응답

---

## 11. 데이터 흐름

```
[사용자 입력]
    title: "2025년 AI 도입 추진 계획"
    core_content: "디지털 전환, 예산 5억, 3단계 추진"
         │
         ▼
[POST /generate]
    promptBuilder → OpenAI gpt-4.1-mini
    → JSON 파싱 → validateNodes
         │
         ▼
[nodes 배열 반환 → 프론트엔드 state]
    [TITLE, BACKGROUND, SECTION, SUBSECTION, SUB_DETAIL, ...]
         │
         ├──→ PreviewPanel: 기호 붙여 HTML로 즉시 렌더
         │
         ▼ (다운로드 버튼 클릭)
[POST /render]
    templateRegistry → template.hwpx 로드
    HWPXRenderer.render()
      ├── TITLE → header.xml charPrIDRef=20 텍스트 교체
      ├── CONTENT_ANCHOR 위치 탐색
      └── 나머지 노드 → XML 생성 후 삽입
         │
         ▼
[HWPX Blob → 브라우저 다운로드]
```

---

## 12. 새 템플릿 추가 방법

### Step 1: 한글에서 template.hwpx 제작

1. 한글 프로그램에서 기관 양식 작성
2. 제목 위치에 `charPrIDRef=20` 스타일 텍스트 (placeholder 텍스트)
3. 본문 시작 위치에 `CONTENT_ANCHOR` 텍스트 단락 추가
4. 저장 후 `.hwpx` 파일을 `/templates/{id}/template.hwpx`에 배치

또는 기존 hwpx에서 스크립트로 자동 추출:
```bash
node scripts/create-report-template.cjs
# /templates/report_basic/template.hwpx 생성
```

### Step 2: definition.json 작성

```json
{
  "id": "plan_basic",
  "name": "계획서",
  "description": "연간 계획 보고에 사용",
  "version": "1.0.0",
  "allowed_node_types": ["TITLE", "BACKGROUND", "SECTION", "SUBSECTION", "BULLET"],
  "node_rules": { ... },
  "style_map": {
    "TITLE":      { "charPrIDRef": "20", "paraPrIDRef": "2",  "styleIDRef": "0" },
    "SECTION":    "section_table",
    "SUBSECTION": { "charPrIDRef": "23", "paraPrIDRef": "31", "styleIDRef": "31" },
    "BULLET":     { "charPrIDRef": "24", "paraPrIDRef": "32", "styleIDRef": "32" }
  },
  "anchor_id": "CONTENT_ANCHOR",
  "ai_instructions": "연간 계획서 형식으로 작성..."
}
```

### Step 3: form_schema.json 작성

```json
{
  "fields": [
    { "id": "title",        "label": "계획서 제목", "type": "text",     "required": true },
    { "id": "core_content", "label": "핵심 내용",  "type": "textarea", "required": true },
    { "id": "year",         "label": "대상 연도",  "type": "select",   "options": ["2025", "2026"] }
  ]
}
```

### Step 4: 랜딩페이지 카드 추가 (`app/work-support2/page.tsx`)

```typescript
const services = [
  { id: 'report', title: '보고서 생성 v2', ... },
  { id: 'plan',   title: '계획서 생성',    subtitle: '...', icon: '📋', path: '/work-support2/plan' },
];
```

**코어 코드 수정 불필요.** API, 렌더러, 검증기는 자동으로 새 템플릿 인식.

---

## 13. 알려진 이슈 및 해결 이력

### [해결] Turbopack + @tailwindcss/postcss 충돌

- **증상**: `Can't resolve 'tailwindcss' in 'C:\Users\...\Desktop\React'`
- **원인**: Turbopack이 PostCSS에 `opts.from`을 전달하지 않음 → `@tailwindcss/node`가 `path.dirname(process.cwd())` (상위 폴더)를 base로 사용 → enhanced-resolve가 상위 폴더에서 탐색 시작
- **해결**: `package.json` dev 스크립트를 `next dev --webpack`으로 변경

### [해결] HWP 제목 중복 출력

- **증상**: 템플릿 원본 제목 + TITLE 노드 제목이 중복 표시
- **원인**: 렌더러가 TITLE 노드를 CONTENT_ANCHOR 위치에 새 단락으로 생성
- **해결**: 렌더러가 TITLE 노드로 템플릿의 `charPrIDRef=20` 텍스트를 regex 교체. CONTENT_ANCHOR에는 TITLE 제외 나머지 노드만 렌더링

### [해결] HWP 제목 자간 과다

- **증상**: 다운로드 HWP에서 제목 글자 간격이 비정상적으로 넓음
- **원인**: `template.hwpx` header.xml의 `charPrIDRef=20`에 `<hh:spacing hangul="18" .../>` 설정
- **해결**: `scripts/create-report-template.cjs` 스크립트로 template.hwpx의 header.xml에서 직접 spacing 값을 0으로 수정 후 저장

### [해결] SUBSECTION / SUB_DETAIL 들여쓰기 동일

- **증상**: HWP에서 ○ 항목과 - 항목이 같은 들여쓰기
- **원인**: `definition.json`에서 SUB_DETAIL이 SUBSECTION과 동일한 `paraPrIDRef=31` 사용
- **해결**: SUB_DETAIL을 `paraPrIDRef=32` (더 깊은 들여쓰기)로 변경

### [해결] BACKGROUND 배경 박스 미적용

- **증상**: 다운로드 HWP에서 배경(BACKGROUND) 텍스트가 상하 테두리 박스 없이 일반 텍스트로 출력
- **원인**: `buildBackgroundPara()`가 단순 `<hp:p>` 단락으로 생성. 원본 템플릿의 배경 박스는 `borderFillIDRef="14"` (상하 테두리)를 가진 1행 1열 테이블 구조
- **해결**: `buildBackgroundPara()`를 `buildSummaryPara()` 방식(원본 `hwpxExporter.ts` 참조)으로 교체. `paraPrIDRef="29"` 외곽 단락 + `borderFillIDRef="14"` 셀 + `charPrIDRef="22"` 텍스트 구조로 변경

### [미해결] SUB_DETAIL과 BULLET 들여쓰기 동일

- 현재 SUB_DETAIL(`-`)과 BULLET(`·`) 모두 `paraPrIDRef=32` 사용으로 들여쓰기 동일
- 추후 BULLET 전용 paraPrIDRef 추가 필요 (header.xml에 새 paraShape 정의 필요)
