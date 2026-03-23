# HWPX 문서 자동화 웹앱 설계 문서

> **프로젝트 목적**: 공무원이 제목과 핵심 내용만 입력하면 AI가 문서 구조를 생성하고 HWPX 템플릿에 매핑하여 완성된 공문서를 다운로드할 수 있는 웹 자동화 시스템

---

## 목차

1. [전체 아키텍처](#1-전체-아키텍처)
2. [기술 스택](#2-기술-스택)
3. [핵심 설계 원칙](#3-핵심-설계-원칙)
4. [노드 타입 시스템](#4-노드-타입-시스템)
5. [프로젝트 폴더 구조](#5-프로젝트-폴더-구조)
6. [템플릿 시스템 설계](#6-템플릿-시스템-설계)
7. [AI 연동 설계](#7-ai-연동-설계)
8. [렌더러 설계](#8-렌더러-설계)
9. [프론트엔드 설계](#9-프론트엔드-설계)
10. [백엔드 API 설계](#10-백엔드-api-설계)
11. [데이터 흐름](#11-데이터-흐름)
12. [개발자 역할 및 작업 가이드](#12-개발자-역할-및-작업-가이드)
13. [개발 순서 로드맵](#13-개발-순서-로드맵)

---

## 1. 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        사용자 브라우저                        │
│                                                             │
│   [템플릿 선택] → [입력폼] → [미리보기] → [HWPX 다운로드]    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────┐
│                   Next.js 웹 애플리케이션                     │
│                                                             │
│  ┌──────────────────┐      ┌──────────────────────────────┐ │
│  │   Frontend       │      │   API Routes (Node.js)       │ │
│  │   (React/TSX)    │      │                              │ │
│  │                  │      │  /api/templates  (목록 조회)  │ │
│  │  DynamicForm     │      │  /api/generate   (AI 생성)   │ │
│  │  PreviewPanel    │      │  /api/render     (HWPX 생성) │ │
│  │  TemplateSelector│      │                              │ │
│  └──────────────────┘      └──────────────┬───────────────┘ │
└────────────────────────────────────────────┼────────────────┘
                                             │
              ┌──────────────────────────────┼──────────────┐
              │                              │              │
   ┌──────────▼──────────┐      ┌────────────▼──────────┐   │
   │   Claude API         │      │   템플릿 파일 시스템    │   │
   │   (Anthropic)        │      │   /templates/         │   │
   │                      │      │   ├── report_basic/   │   │
   │  JSON nodes 배열 반환 │      │   ├── plan_basic/     │   │
   └──────────────────────┘      │   └── announcement/   │   │
                                 └───────────────────────┘   │
```

---

## 2. 기술 스택

| 영역 | 기술 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 14 (App Router) | 프론트+백엔드 단일 프로젝트 |
| 언어 | TypeScript | 타입 안전성, 유지보수 |
| 스타일링 | Tailwind CSS | 빠른 UI 개발 |
| AI | Anthropic Claude API | 고품질 한국어 문서 생성 |
| HWPX 처리 | JSZip + fast-xml-parser | ZIP/XML 조작 (Node.js 순수) |
| 상태관리 | React Context 또는 Zustand | 폼 상태, 생성 결과 관리 |
| 배포 | Vercel 또는 사내 서버 | 환경에 따라 선택 |

**핵심**: Python 없이 순수 Node.js만으로 HWPX 처리가 가능하므로 스택을 하나로 통일.

---

## 3. 핵심 설계 원칙

### 원칙 1: 템플릿 추가 = 코드 수정 없음 (코어 로직 기준)

새 템플릿을 추가할 때 렌더러, 검증기, 폼 렌더링 같은 **코어 코드는 수정하지 않는다**.
개발자는 템플릿 폴더에 파일 3개만 추가하면 된다.

```
할 일:
1. /templates/{template_id}/ 폴더 생성
2. template.hwpx 제작 (한글 프로그램에서)
3. definition.json 작성
4. form_schema.json 작성
→ 코어 코드 수정 없음
```

### 원칙 2: 노드 타입 고정 + 조합은 가변

AI가 완전 자유롭게 생성하면 렌더러가 예측 불가능해지고,
너무 고정하면 다양한 문서를 만들 수 없다.
**노드 타입은 고정, 조합과 개수는 가변**으로 설계한다.

### 원칙 3: 플랫 배열 구조

트리 구조 대신 순서가 있는 플랫 배열로 노드를 표현한다.
렌더러가 순서대로 읽으면서 타입에 맞는 스타일을 적용하므로 구현이 단순해진다.

### 원칙 4: 사용자 vs 개발자 역할 명확 분리

```
사용자(공무원)가 하는 것       개발자가 하는 것
────────────────────────       ─────────────────────────────
템플릿 선택                    새 템플릿 폴더 및 파일 추가
입력폼 작성                    definition.json 작성
미리보기 확인                  form_schema.json 작성
HWPX 다운로드                  template.hwpx 한글에서 제작
                               코드 배포
```

---

## 4. 노드 타입 시스템

렌더러가 인식하는 노드 타입은 아래 6가지로 고정된다.
AI는 이 타입들을 조합해서 플랫 배열을 생성한다.

| 노드 타입 | HWP 스타일 역할 | 필수 여부 | 개수 |
|-----------|----------------|-----------|------|
| `TITLE` | 문서 제목 | 필수 | 정확히 1개 |
| `BACKGROUND` | 배경/개요 문단 | 선택 | 0~1개 |
| `SECTION` | 1단계 섹션 제목 | 필수 | 1~N개 |
| `SUBSECTION` | 2단계 소제목 | 선택 | 0~N개 |
| `SUB_DETAIL` | 3단계 세부항목 | 선택 | 0~N개 |
| `BULLET` | 글머리 기호 항목 | 선택 | 0~N개 |

### 노드 배열 예시

**단순한 문서**
```json
{
  "nodes": [
    { "type": "TITLE",    "content": "2025년 상반기 업무보고" },
    { "type": "SECTION",  "content": "1. 추진 현황" },
    { "type": "BULLET",   "content": "예산 집행률 82%" },
    { "type": "BULLET",   "content": "주요 성과 3건 달성" },
    { "type": "SECTION",  "content": "2. 향후 계획" },
    { "type": "BULLET",   "content": "하반기 예산 집행 완료 목표" }
  ]
}
```

**복잡한 문서**
```json
{
  "nodes": [
    { "type": "TITLE",      "content": "2025년 상반기 업무보고" },
    { "type": "BACKGROUND", "content": "본 보고서는 2025년 상반기 주요 업무 추진 현황을 정리한 것입니다." },
    { "type": "SECTION",    "content": "1. 예산 집행 현황" },
    { "type": "SUBSECTION", "content": "1-1. 부서별 집행 내역" },
    { "type": "SUB_DETAIL", "content": "1-1-1. 기획팀" },
    { "type": "BULLET",     "content": "집행률 95%, 잔액 500만원" },
    { "type": "SUB_DETAIL", "content": "1-1-2. 운영팀" },
    { "type": "BULLET",     "content": "집행률 78%, 잔액 2,200만원" },
    { "type": "SUBSECTION", "content": "1-2. 미집행 사유" },
    { "type": "BULLET",     "content": "사업 일정 지연으로 인한 이월" },
    { "type": "SECTION",    "content": "2. 향후 계획" },
    { "type": "SUBSECTION", "content": "2-1. 하반기 중점 과제" },
    { "type": "BULLET",     "content": "잔여 예산 9월 내 집행 완료" }
  ]
}
```

### 노드 순서 규칙 (검증 레이어에서 강제)

```
1. nodes[0]은 반드시 TITLE
2. SUBSECTION 앞에는 반드시 SECTION이 존재
3. SUB_DETAIL 앞에는 반드시 SUBSECTION이 존재
4. BULLET은 어디에나 올 수 있음
5. 알 수 없는 type은 거부
6. 전체 노드 수: 3 ~ 100개
```

---

## 5. 프로젝트 폴더 구조

```
project-root/
│
├── app/                              # Next.js App Router
│   ├── page.tsx                      # 메인 페이지
│   ├── layout.tsx
│   └── api/
│       ├── templates/
│       │   └── route.ts              # GET: 템플릿 목록 반환
│       ├── generate/
│       │   └── route.ts              # POST: AI nodes 배열 생성
│       └── render/
│           └── route.ts              # POST: HWPX 파일 생성 및 반환
│
├── components/
│   ├── TemplateSelector.tsx          # 템플릿 선택 UI
│   ├── DynamicForm.tsx               # form_schema 기반 자동 폼 렌더링
│   ├── PreviewPanel.tsx              # nodes 배열 → HTML 미리보기
│   └── DownloadButton.tsx
│
├── lib/
│   ├── templateRegistry.ts           # 템플릿 폴더 스캔 및 로드
│   ├── promptBuilder.ts              # definition.json → Claude 프롬프트 생성
│   ├── nodesValidator.ts             # nodes 배열 규칙 검증
│   └── hwpxRenderer.ts              # nodes 배열 + template.hwpx → output.hwpx
│
├── templates/                        # ← 개발자 확장 포인트
│   ├── report_basic/
│   │   ├── template.hwpx             # 한글에서 제작한 양식 파일
│   │   ├── definition.json           # 템플릿 정의 (허용 노드, 스타일 매핑, AI 지침)
│   │   └── form_schema.json          # 입력폼 필드 정의
│   │
│   ├── plan_basic/
│   │   ├── template.hwpx
│   │   ├── definition.json
│   │   └── form_schema.json
│   │
│   └── announcement/
│       ├── template.hwpx
│       ├── definition.json
│       └── form_schema.json
│
├── types/
│   └── index.ts                      # 공통 TypeScript 타입 정의
│
└── public/
```

---

## 6. 템플릿 시스템 설계

### 6-1. definition.json (템플릿 계약서)

이 파일이 템플릿-스키마-스타일맵을 하나의 단위로 묶는 핵심 파일이다.

```json
{
  "id": "report_basic",
  "name": "기본 업무보고서",
  "description": "일반적인 업무 보고에 사용하는 양식",
  "version": "1.0.0",

  "allowed_node_types": [
    "TITLE", "BACKGROUND", "SECTION", "SUBSECTION", "BULLET"
  ],

  "node_rules": {
    "TITLE":      { "required": true,  "min": 1, "max": 1  },
    "BACKGROUND": { "required": false, "min": 0, "max": 1  },
    "SECTION":    { "required": true,  "min": 1, "max": 10 },
    "SUBSECTION": { "required": false, "min": 0, "max": 20 },
    "BULLET":     { "required": false, "min": 0, "max": 50 }
  },

  "style_map": {
    "TITLE":      "hwp_style_title",
    "BACKGROUND": "hwp_style_background",
    "SECTION":    "hwp_style_heading1",
    "SUBSECTION": "hwp_style_heading2",
    "BULLET":     "hwp_style_bullet"
  },

  "anchor_id": "CONTENT_ANCHOR",

  "ai_instructions": "공식 업무보고서 형식으로 작성하세요. 배경은 2~3문장으로 간결하게, 섹션은 3~5개를 권장합니다. 번호 체계(1., 1-1., 1-1-1.)를 일관되게 사용하세요."
}
```

### 6-2. form_schema.json (입력폼 정의)

프론트엔드 DynamicForm 컴포넌트가 이 파일을 읽어 폼을 자동으로 렌더링한다.

```json
{
  "fields": [
    {
      "id": "title",
      "label": "문서 제목",
      "type": "text",
      "required": true,
      "placeholder": "예: 2025년 상반기 업무보고"
    },
    {
      "id": "core_content",
      "label": "핵심 내용",
      "type": "textarea",
      "required": true,
      "placeholder": "보고할 핵심 내용을 자유롭게 입력하세요.\n예: 예산 집행률 82%, 주요 성과 3건, 미진행 과제 2건, 하반기 계획"
    },
    {
      "id": "include_background",
      "label": "배경 섹션 포함",
      "type": "toggle",
      "default": true
    },
    {
      "id": "section_depth",
      "label": "문서 깊이",
      "type": "select",
      "options": ["AI 자동", "섹션만", "섹션+소제목", "섹션+소제목+세부항목"],
      "default": "AI 자동"
    }
  ]
}
```

### 6-3. template.hwpx (한글 양식 파일)

개발자가 한글 프로그램에서 직접 제작하는 파일.

**포함되어야 할 것:**
- 문서 용지 설정 (A4, 여백)
- 폰트 정의 (맑은 고딕, 굴림 등)
- 스타일 정의 (definition.json의 style_map과 일치하는 스타일 ID)
- 머리말/꼬리말, 기관 로고, 직인 이미지 등 고정 서식
- 본문 삽입 위치를 나타내는 앵커 문단 (`CONTENT_ANCHOR`)

**포함하지 말아야 할 것:**
- 실제 본문 내용 (렌더러가 동적으로 삽입)

---

## 7. AI 연동 설계

### 7-1. 프롬프트 구성 방식

`promptBuilder.ts`가 definition.json + 사용자 입력을 조합해서 Claude에게 보내는 프롬프트를 동적으로 생성한다.

**System Prompt 구조:**
```
[역할 지시]
당신은 한국 공문서 작성 전문가입니다.

[사용 가능한 노드 타입]
TITLE, BACKGROUND, SECTION, SUBSECTION, BULLET (이 템플릿 기준)

[노드 순서 규칙]
- TITLE은 반드시 첫 번째, 1개만
- SUBSECTION은 SECTION 다음에만 위치
- BULLET은 어디에나 위치 가능

[AI 지침 - definition.json의 ai_instructions]
공식 업무보고서 형식으로 작성...

[출력 형식 - 엄격 강제]
반드시 아래 JSON 형식만 출력. 다른 텍스트, 마크다운 없음.
{ "nodes": [ { "type": "...", "content": "..." } ] }
```

**User Prompt 구조:**
```
문서 제목: {사용자 입력 title}
핵심 내용: {사용자 입력 core_content}
배경 섹션: {포함/미포함}
문서 깊이: {AI 자동 / 섹션만 / ...}
```

### 7-2. 재시도 전략

```
Claude API 호출
    ↓
JSON 파싱 성공?
    NO → 재시도 (최대 3회)
    YES ↓
노드 규칙 검증 통과?
    NO → 실패 이유 포함해서 재시도 (최대 3회)
    YES ↓
렌더러로 전달
```

재시도 시 실패 이유를 프롬프트에 포함시켜 AI가 수정하도록 유도한다.

---

## 8. 렌더러 설계

### 8-1. 동작 원리

HWPX는 ZIP으로 압축된 XML 파일 묶음이다. 렌더러는 다음 순서로 동작한다.

```
1. template.hwpx를 메모리에서 ZIP으로 열기 (JSZip)
2. 내부 XML(본문 섹션) 파싱 (fast-xml-parser)
3. CONTENT_ANCHOR 노드 위치 찾기
4. nodes 배열을 순서대로 순회하며 XML 노드 생성
   - node.type → style_map → HWP 스타일 ID 조회
   - 해당 스타일로 HWP 문단 XML 엘리먼트 생성
   - ANCHOR 위치에 삽입
5. ANCHOR 노드 제거
6. 수정된 XML을 ZIP에 다시 쓰기
7. ZIP을 Buffer로 직렬화 → HTTP 응답으로 다운로드 전송
```

### 8-2. 렌더러 핵심 로직 개요

```typescript
// hwpxRenderer.ts 구조 (코드 구현 시 상세 작성)

class HWPXRenderer {
  render(templateBuffer: Buffer, nodes: Node[], styleMap: StyleMap): Buffer
  
  private findAnchor(xmlTree, anchorId: string): XmlNode
  private createParagraph(content: string, styleId: string): XmlNode
  private injectNodes(xmlTree, anchor: XmlNode, nodes: Node[], styleMap): void
}
```

### 8-3. 타입-스타일 매핑

렌더러는 definition.json의 `style_map`을 참조하므로, 렌더러 코드 자체에는 스타일 정보가 없다. 따라서 템플릿마다 다른 스타일을 적용할 수 있다.

```
노드 타입       →  style_map 조회  →  HWP 스타일 ID  →  문단 생성
"SECTION"       →  "heading1"      →  "hwp_style_003" →  해당 스타일 적용
```

---

## 9. 프론트엔드 설계

### 9-1. 페이지 흐름

```
① 템플릿 선택 화면
   └→ /api/templates 호출해서 사용 가능한 템플릿 목록 표시

② 입력폼 화면
   └→ form_schema.json 기반으로 DynamicForm이 자동 렌더링
   └→ 사용자 입력 완료 후 "문서 생성" 버튼

③ 생성 중 상태
   └→ /api/generate 호출 (Claude API)
   └→ 로딩 인디케이터 표시

④ 미리보기 화면
   └→ 반환된 nodes 배열을 HTML로 시각화
   └→ "다시 생성" 또는 "HWPX 다운로드" 버튼

⑤ 다운로드
   └→ /api/render 호출
   └→ .hwpx 파일 브라우저 다운로드
```

### 9-2. DynamicForm 컴포넌트

form_schema.json의 `type` 필드에 따라 다른 입력 컴포넌트를 렌더링한다.

| type 값 | 렌더링 컴포넌트 |
|---------|---------------|
| `text` | `<input type="text">` |
| `textarea` | `<textarea>` |
| `toggle` | 토글 스위치 |
| `select` | `<select>` 드롭다운 |

### 9-3. PreviewPanel 컴포넌트

nodes 배열을 받아 HTML로 시각적 미리보기를 렌더링한다.
실제 HWPX와 완전히 동일하지 않지만, 내용과 구조를 확인하는 용도로 충분하다.

---

## 10. 백엔드 API 설계

### GET /api/templates

템플릿 폴더를 스캔하여 사용 가능한 템플릿 목록을 반환한다.

**Response:**
```json
[
  { "id": "report_basic", "name": "기본 업무보고서", "description": "..." },
  { "id": "plan_basic",   "name": "업무 계획서",     "description": "..." }
]
```

### POST /api/generate

사용자 입력과 선택한 템플릿 ID를 받아 Claude API를 호출하고 nodes 배열을 반환한다.

**Request:**
```json
{
  "templateId": "report_basic",
  "formData": {
    "title": "2025년 상반기 업무보고",
    "core_content": "예산 집행률 82%, 주요 성과 3건...",
    "include_background": true,
    "section_depth": "AI 자동"
  }
}
```

**Response:**
```json
{
  "nodes": [
    { "type": "TITLE", "content": "2025년 상반기 업무보고" },
    ...
  ]
}
```

### POST /api/render

nodes 배열과 템플릿 ID를 받아 HWPX 파일을 생성하고 파일을 반환한다.

**Request:**
```json
{
  "templateId": "report_basic",
  "nodes": [ ... ]
}
```

**Response:** `application/octet-stream` (HWPX 파일 바이너리)

---

## 11. 데이터 흐름

```
[사용자]
  │
  │ 템플릿 선택
  ▼
[GET /api/templates]
  │ 템플릿 목록
  ▼
[DynamicForm 렌더링] ← form_schema.json
  │
  │ 사용자 입력 제출
  ▼
[POST /api/generate]
  │
  ├─ definition.json 로드
  ├─ promptBuilder → System + User Prompt 구성
  ├─ Claude API 호출
  ├─ JSON 파싱
  ├─ nodesValidator 검증
  │    실패 시 재시도 (최대 3회)
  │
  │ nodes 배열 반환
  ▼
[PreviewPanel] → 미리보기 표시
  │
  │ 다운로드 버튼 클릭
  ▼
[POST /api/render]
  │
  ├─ template.hwpx 읽기
  ├─ definition.json의 style_map 로드
  ├─ HWPXRenderer.render(template, nodes, styleMap)
  │    ZIP 열기 → XML 파싱 → 노드 주입 → ZIP 재압축
  │
  │ HWPX Buffer 반환
  ▼
[브라우저 파일 다운로드]
```

---

## 12. 개발자 역할 및 작업 가이드

### 12-1. 코어 시스템 개발 (최초 1회)

코어 시스템은 한 번만 개발하면 이후 템플릿 추가 시 수정이 불필요하다.

**개발해야 할 코어 모듈:**

| 모듈 | 파일 | 역할 |
|------|------|------|
| 템플릿 레지스트리 | `lib/templateRegistry.ts` | /templates 폴더 스캔, definition/form_schema 로드 |
| 프롬프트 빌더 | `lib/promptBuilder.ts` | definition.json + 사용자 입력 → Claude 프롬프트 |
| 검증기 | `lib/nodesValidator.ts` | nodes 배열 규칙 검증, 오류 메시지 생성 |
| 렌더러 | `lib/hwpxRenderer.ts` | nodes + template.hwpx → output.hwpx |
| API Routes | `app/api/*/route.ts` | 3개 엔드포인트 구현 |
| DynamicForm | `components/DynamicForm.tsx` | form_schema 기반 폼 자동 렌더링 |
| PreviewPanel | `components/PreviewPanel.tsx` | nodes 배열 HTML 미리보기 |

### 12-2. 새 템플릿 추가 시 개발자 작업 (반복 작업)

새 공문서 유형을 추가할 때마다 아래 작업을 수행한다.

**Step 1: 한글 프로그램에서 template.hwpx 제작**

```
- 한글(HWP) 프로그램 실행
- 해당 공문서 양식 제작
  ✓ 용지 설정 (A4, 여백)
  ✓ 폰트 및 스타일 정의
  ✓ 머리말/꼬리말
  ✓ 기관 로고, 직인 등 고정 서식
  ✓ 스타일 ID를 definition.json의 style_map과 일치시킬 것
  ✓ 본문이 삽입될 위치에 앵커 문단 텍스트 삽입 (예: "CONTENT_ANCHOR")
- .hwpx 형식으로 저장
- /templates/{template_id}/template.hwpx 에 배치
```

**Step 2: definition.json 작성**

```
- 이 템플릿에서 허용할 노드 타입 결정
- 각 타입의 min/max 규칙 설정
- style_map: 노드 타입 → template.hwpx의 실제 스타일 ID 매핑
  (한글에서 스타일 이름 확인 필요)
- anchor_id: template.hwpx에서 설정한 앵커 텍스트와 일치시킬 것
- ai_instructions: 이 문서 유형에 맞는 AI 작성 지침 작성
```

**Step 3: form_schema.json 작성**

```
- 이 템플릿에 필요한 입력 필드 정의
- 필수 필드: title, core_content
- 선택 필드: 템플릿 특성에 맞게 추가
  예) 출장보고서 → 출장지, 출장 기간, 출장 목적 필드 추가
- 각 필드의 type, label, placeholder, default 값 설정
```

**Step 4: 로컬 테스트**

```
- 개발 서버 실행 (npm run dev)
- 새 템플릿이 목록에 표시되는지 확인
- 입력폼이 정상적으로 렌더링되는지 확인
- AI 생성 → nodes 배열 구조 검증
- HWPX 다운로드 → 한글에서 열어서 서식 확인
```

**Step 5: 배포**

```
- Git 커밋 및 푸시
- 배포 파이프라인 실행
```

### 12-3. template.hwpx 제작 시 주의사항

HWPX 렌더러가 정상 동작하려면 template.hwpx 제작 시 아래 사항을 반드시 지켜야 한다.

```
1. 스타일 ID 일관성
   한글에서 정의한 스타일 이름/ID가 definition.json의 style_map 값과 정확히 일치해야 함

2. 앵커 문단
   본문이 삽입될 위치에 앵커 식별 텍스트를 포함한 빈 문단을 만들어야 함
   예) 문단 텍스트: "CONTENT_ANCHOR"
   렌더러가 이 문단을 찾아서 그 위치에 생성된 내용을 삽입함

3. 본문 내용 비우기
   template.hwpx에는 고정 서식(머리말, 로고 등)만 포함하고
   실제 본문은 앵커 문단 하나만 남겨야 함

4. HWPX 형식으로 저장
   .hwp가 아닌 .hwpx 형식으로 저장할 것 (XML 기반이라 파싱 가능)
```

### 12-4. HWPX XML 구조 분석 방법

렌더러 개발 시 실제 HWPX의 XML 구조를 먼저 파악해야 한다.

```bash
# HWPX는 ZIP 파일이므로 확장자를 .zip으로 바꿔서 압축 해제
cp sample.hwpx sample.zip
unzip sample.zip -d sample_unpacked/

# 내부 구조 확인
# Contents/section0.xml 이 본문 XML
# 네임스페이스, 태그 구조, 스타일 ID 확인
```

---

## 13. 개발 순서 로드맵

### Phase 1: 기반 구축 (1~2주)

```
□ Next.js + TypeScript 프로젝트 초기화
□ 폴더 구조 생성
□ 공통 타입 정의 (types/index.ts)
□ 첫 번째 template.hwpx 제작 (report_basic)
□ HWPX ZIP/XML 구조 분석
□ templateRegistry.ts 구현
```

### Phase 2: AI 연동 (1주)

```
□ Claude API 키 설정
□ promptBuilder.ts 구현
□ nodesValidator.ts 구현
□ POST /api/generate 엔드포인트 구현
□ 재시도 로직 구현
□ nodes 배열 생성 품질 테스트
```

### Phase 3: 렌더러 구현 (1~2주)

```
□ hwpxRenderer.ts 구현
  - JSZip으로 HWPX 열기/쓰기
  - XML 파싱 및 앵커 탐색
  - 노드 타입별 XML 문단 생성
  - 스타일 매핑 적용
□ POST /api/render 엔드포인트 구현
□ 렌더링 결과 한글에서 서식 확인 테스트
```

### Phase 4: 프론트엔드 (1주)

```
□ TemplateSelector.tsx
□ DynamicForm.tsx (form_schema 기반 자동 렌더링)
□ PreviewPanel.tsx (nodes HTML 미리보기)
□ DownloadButton.tsx
□ 전체 사용자 흐름 연결
```

### Phase 5: 확장성 검증 (1주)

```
□ 두 번째 템플릿 추가 (plan_basic)
  → 코어 코드 수정 없이 추가 가능한지 확인
□ 세 번째 템플릿 추가 (announcement)
□ 엣지 케이스 테스트 (AI 재시도, 검증 실패 등)
□ 배포 환경 설정
```

---

## 부록: 핵심 TypeScript 타입 정의

```typescript
// types/index.ts

export type NodeType = 
  'TITLE' | 'BACKGROUND' | 'SECTION' | 
  'SUBSECTION' | 'SUB_DETAIL' | 'BULLET';

export interface DocumentNode {
  type: NodeType;
  content: string;
}

export interface NodeRule {
  required: boolean;
  min: number;
  max: number;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  allowed_node_types: NodeType[];
  node_rules: Record<NodeType, NodeRule>;
  style_map: Record<NodeType, string>;
  anchor_id: string;
  ai_instructions: string;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'toggle' | 'select';
  required?: boolean;
  placeholder?: string;
  default?: string | boolean;
  options?: string[];
}

export interface FormSchema {
  fields: FormField[];
}

export interface GenerateRequest {
  templateId: string;
  formData: Record<string, string | boolean>;
}

export interface GenerateResponse {
  nodes: DocumentNode[];
}
```
