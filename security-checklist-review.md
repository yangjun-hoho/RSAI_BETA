# AI 정보화사업 보안성검토 체크리스트 대비 현황 분석

> 기준문서: 국가정보원 「AI 정보화사업 보안성검토 체크리스트 등 안내」(2026.1.19)
> 검토대상: rsai_ver2 (Next.js 기반 AI 업무지원 웹 애플리케이션)
> 최초 검토일: 2026-03-16
> 최종 업데이트: 2026-03-16 (즉시 조치 3개 항목 반영)

---

## 범례

| 기호 | 의미 |
|------|------|
| ✅ | 충족 |
| ⚠️ | 부분 충족 (보완 필요) |
| ❌ | 미충족 (조치 필요) |
| 🔧 | 조치 완료 (금번 업데이트) |
| N/A | 해당 없음 |

---

## 1. 공통 보안대책

### 데이터 수집

| # | 체크리스트 | 상태 | 현황 및 조치사항 |
|---|-----------|------|----------------|
| ① | 신뢰할 수 있는 출처의 데이터 활용 | ✅ | OpenAI(gpt-4o), Google Gemini 공식 API만 사용. RAG 문서는 관리자 업로드로만 등록 가능 (`/api/rag/admin/upload`) |
| ② | 오염데이터 유입 방지를 위한 데이터 검사 수행 | ⚠️ | PII 필터(`lib/security/piiFilter.ts`)로 개인정보 패턴 차단 적용됨. 그러나 RAG 업로드 시 악성코드·오염 문서 자동 스캔 체계 미구축 → **업로드 파일 MIME 재검증 및 콘텐츠 필터링 추가 필요 (단기 과제)** |

---

### AI 학습

| # | 체크리스트 | 상태 | 현황 및 조치사항 |
|---|-----------|------|----------------|
| ③ | AI시스템 보안등급에 맞는 학습데이터 구성·활용 | ⚠️ | 외부 API(OpenAI, Gemini) 사용으로 자체 학습 없음. RAG 벡터DB에 저장되는 문서에 대한 등급 분류 체계 없음 → **RAG 문서 보안등급 분류 및 접근 권한 세분화 검토 필요 (단기 과제)** |
| ④ | 저장소·DB 등에 보관된 학습데이터에 대한 사용자 접근통제 | ⚠️ | RAG DB(`/data/rag.db`) 및 앱 DB 접근은 `lib/auth/adminAuth.ts`의 `requireAdmin()` 함수로 관리자 권한 검증 적용됨. DB 파일 자체의 OS 레벨 접근 통제 및 MFA 미적용 → **관리자 계정 MFA 적용 및 DB 파일 접근권한 설정 강화 필요 (단기 과제)** |
| ⑤ | 신뢰할 수 있는 출처의 AI모델·라이브러리 활용 | ✅ | OpenAI SDK(`openai ^6.22.0`), Google GenAI SDK(`@google/genai ^1.42.0`), jose, bcryptjs 등 공식 패키지만 사용. `package.json` 확인됨 |
| ⑥ | AI시스템 로깅·모니터링 | 🔧 | **[조치 완료]** 기존 PII 탐지 로그(`pii_logs` 테이블)에 더해 **API 요청 감사 로그 체계 신설**<br><br>**신설 내용:**<br>- `lib/app-db/db.ts` — `audit_logs` 테이블 추가 (`user_id`, `ip`, `method`, `path`, `status_code`, `user_agent`, `created_at`)<br>- `lib/security/auditLog.ts` — `logAudit(req, opts)` 함수 신설<br>- 5개 AI API route에 적용: `/api/chat`, `/api/work-support/report`, `/api/work-support/greetings`, `/api/work-support/merit-citation`, `/api/work-support/press-release`<br>- 정상 요청(200) 및 차단 요청(400) 모두 기록<br><br>**잔여 과제:** 비정상 패턴 자동 탐지·경보 체계 추가 필요 |

---

### AI 시스템 구축·운영

| # | 체크리스트 | 상태 | 현황 및 조치사항 |
|---|-----------|------|----------------|
| ⑦ | AI시스템 입·출력 보안대책 수립 | 🔧 | **[조치 완료]** 입력 길이 제한 및 요청 속도 제한 구현<br><br>**입·출력 필터링 (기존):**<br>- `lib/security/piiFilter.ts`의 `rejectIfPii()` 함수로 주민번호·전화번호·이메일 등 차단<br><br>**입력 길이 제한 (신규):**<br>- `lib/security/inputValidation.ts` — `rejectIfTooLong()` 유틸 신설<br>- 적용 경로 및 제한값:<br>  - `/api/chat` : 메시지 최대 **3,000자**<br>  - `/api/work-support/report` : 제목 **200자**, 핵심내용 **2,000자**<br>  - `/api/work-support/greetings` : 상황 **1,000자**, 핵심내용 **1,000자**, 발화자 **100자**<br>  - `/api/work-support/merit-citation` : 주요 공적 **2,000자**<br>  - `/api/work-support/press-release` : 핵심내용 **2,000자**, 제목 **200자**<br><br>**요청 속도 제한 (신규):**<br>- `proxy.ts` 신설 — IP당 **1분에 최대 30회** 제한 (인메모리 Map 방식)<br>- 초과 시 `429 Too Many Requests` + `Retry-After` 헤더 반환<br>- 응답 헤더에 `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` 포함<br>- 적용 경로: `/api/chat/*`, `/api/work-support/*`, `/api/rag/query/*`, `/api/templates/*`<br><br>**잔여 과제:** 금칙어·적대적 공격 문구 필터, 유사질의 반복 패턴 탐지 추가 필요 |
| ⑧ | AI시스템 경계보안 수행 | 🔧 | **[부분 조치]** `proxy.ts` 신설로 AI API 경로 전체에 Rate Limiting 전역 적용됨. JWT 쿠키 기반 인증(`lib/auth/session.ts`) 및 `requireAdmin()` 함수로 관리자·일반사용자 권한 분리 유지<br><br>**잔여 과제:** 인증 미완료 사용자의 AI API 접근 차단을 proxy 레벨에서 일괄 통제하는 인증 검증 로직 추가 필요 |
| ⑨ | AI시스템 통신구간 보호 | 🔧 | **[조치 완료]** `next.config.ts`에 HTTP 보안 헤더 전 경로(`/:path*`) 일괄 적용<br><br>**적용된 보안 헤더:**<br>- `Strict-Transport-Security: max-age=31536000; includeSubDomains` — HTTPS 강제 (1년)<br>- `X-Frame-Options: SAMEORIGIN` — 클릭재킹 방지<br>- `X-Content-Type-Options: nosniff` — MIME 타입 스니핑 방지<br>- `X-XSS-Protection: 1; mode=block` — XSS 방어 (구형 브라우저)<br>- `Referrer-Policy: strict-origin-when-cross-origin` — Referrer 정보 제한<br>- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — 불필요한 브라우저 기능 차단<br><br>**잔여 과제:** 프로덕션 배포 시 인프라 레벨(Nginx 등)에서 TLS 1.2 이상 강제 적용 확인 필요 |
| ⑩ | AI시스템에 과도한 권한 부여 제한 | ✅ | AI API 호출 권한은 API 키 발급 범위로 제한됨. 파일 시스템·DB 작업은 Next.js 서버 프로세스 범위로 국한. 사용자 요청으로 서버 파일 직접 수정 불가 구조 |
| ⑪ | 설명 가능한 AI 구성 | ⚠️ | AI 생성 결과를 UI에 직접 출력하는 구조로 사용자가 결과를 검토 가능. 그러나 AI 추론 근거·참조 출처 시각화 미구현 (RAG 사용 시 출처 문서 표시 없음) → **RAG 응답 시 참조 문서 출처 표시 기능 보완 필요 (중기 과제)** |
| ⑫ | AI시스템 취약점 점검 | ❌ | 소프트웨어·라이브러리 취약점 자동 점검 및 퍼징 테스트 체계 없음 → **정기적 `npm audit` 실행 및 의존성 보안 업데이트 프로세스 수립 필요 (중기 과제)** |
| ⑬ | AI시스템 복구방안 마련 | ❌ | SQLite DB 파일(`/data/rag.db`, `/data/app.db`) 정기 백업 절차 미수립 → **일별 DB 백업 스크립트 및 복구 절차 문서화 필요 (중기 과제)** |
| ⑭ | AI시스템 사용자·용역업체 보안관리 | ❌ | 사용자 대상 보안수칙 안내·교육 체계 없음. 용역업체 보안관리 절차 없음 → **서비스 이용약관 내 보안수칙 명시 및 관리자 보안교육 절차 수립 필요 (중기 과제)** |

---

### AI 시스템 폐기

| # | 체크리스트 | 상태 | 현황 및 조치사항 |
|---|-----------|------|----------------|
| ⑮ | AI시스템 구성요소 삭제 방안 마련 | ❌ | 시스템 폐기 시 DB·로그·벡터 데이터 안전 삭제 절차 없음 → **폐기 시 SQLite DB 파일, 환경변수(API 키), audit_logs 포함 전체 로그 완전 삭제 절차 문서화 필요 (중기 과제)** |

---

## 2. 에이전틱 AI 추가 대책

현재 rsai_ver2는 단순 요청-응답 방식의 AI API 호출 구조로, **자율적으로 도구를 사용하거나 연속 작업을 수행하는 에이전틱 AI에 해당하지 않음** → 해당 항목(①~④) 전체 **N/A**

---

## 3. 피지컬 AI 추가 대책

하드웨어·센서·로봇 등 물리적 AI 시스템 없음 → 해당 항목(①②) 전체 **N/A**

---

## 4. 종합 현황 요약

### 최초 검토 대비 변화

| 구분 | 최초(2026-03-16) | 현재 |
|------|-----------------|------|
| 충족 ✅ | 3 | 3 |
| 부분충족 ⚠️ | 7 | 4 |
| 미충족 ❌ | 4 | 4 |
| 조치완료 🔧 | - | 3 |
| 해당없음 N/A | 1 | 1 |

> ⑥ 로깅·모니터링, ⑦ 입·출력 보안대책, ⑧ 경계보안(부분), ⑨ 통신구간 보호 → **🔧 조치 완료**

### 잔여 과제 현황

| 우선순위 | 항목 | 내용 |
|---------|------|------|
| 단기 | ② | RAG 업로드 파일 오염 검사 |
| 단기 | ③④ | RAG 문서 등급 분류, 관리자 MFA |
| 단기 | ⑧ | proxy 레벨 인증 통제 강화 |
| 단기 | ⑦ | 금칙어·공격 문구 필터, 유사질의 반복 탐지 |
| 중기 | ⑪ | RAG 응답 출처 표시 |
| 중기 | ⑫ | 의존성 취약점 정기 점검 (`npm audit`) |
| 중기 | ⑬ | DB 정기 백업 자동화 |
| 중기 | ⑭ | 사용자 보안수칙 안내, 용역업체 보안관리 |
| 중기 | ⑮ | 시스템 폐기 절차 문서화 |

---

## 5. 금번 조치 상세 내역 (2026-03-16)

### 조치 1 — API 요청 감사 로그 (체크리스트 ⑥)

| 파일 | 변경 내용 |
|------|---------|
| `lib/app-db/db.ts` | `audit_logs` 테이블 신설 |
| `lib/security/auditLog.ts` | `logAudit(req, opts)` 함수 신설 |
| `app/api/chat/route.ts` | `logAudit()` 호출 추가 |
| `app/api/work-support/report/route.ts` | `logAudit()` 호출 추가 |
| `app/api/work-support/greetings/route.ts` | `logAudit()` 호출 추가 |
| `app/api/work-support/merit-citation/route.ts` | `logAudit()` 호출 추가 |
| `app/api/work-support/press-release/route.ts` | `logAudit()` 호출 추가 |

```sql
-- audit_logs 테이블 구조
CREATE TABLE IF NOT EXISTS audit_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER,
  ip           TEXT    NOT NULL DEFAULT '',
  method       TEXT    NOT NULL DEFAULT '',
  path         TEXT    NOT NULL,
  status_code  INTEGER,
  user_agent   TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

---

### 조치 2 — 입력 길이 제한 (체크리스트 ⑦)

| 파일 | 변경 내용 |
|------|---------|
| `lib/security/inputValidation.ts` | `rejectIfTooLong(rules)` 유틸 신설 |
| `app/api/chat/route.ts` | 메시지 3,000자 제한 |
| `app/api/work-support/report/route.ts` | 제목 200자, 핵심내용 2,000자 제한 |
| `app/api/work-support/greetings/route.ts` | 상황 1,000자, 핵심내용 1,000자, 발화자 100자 제한 |
| `app/api/work-support/merit-citation/route.ts` | 주요 공적 2,000자 제한 |
| `app/api/work-support/press-release/route.ts` | 핵심내용 2,000자, 제목 200자 제한 |

초과 시 `400 Bad Request` + 초과 필드명·현재 글자 수 응답.

---

### 조치 3 — Rate Limiting (체크리스트 ⑦⑧)

| 파일 | 변경 내용 |
|------|---------|
| `proxy.ts` | 신설 — IP당 1분 30회 제한 (인메모리) / Next.js 16+ proxy 컨벤션 적용 |

- **적용 경로**: `/api/chat/*`, `/api/work-support/*`, `/api/rag/query/*`, `/api/templates/*`
- **제한 초과 시**: `429 Too Many Requests` + `Retry-After: N` 헤더
- **정상 응답 헤더**: `X-RateLimit-Limit: 30`, `X-RateLimit-Remaining: N`, `X-RateLimit-Reset: epoch`
- **메모리 관리**: 5분마다 만료된 항목 자동 정리 (메모리 누수 방지)

---

### 조치 4 — HTTP 보안 헤더 (체크리스트 ⑨)

| 파일 | 변경 내용 |
|------|---------|
| `next.config.ts` | `headers()` 설정 추가 — 전 경로 보안 헤더 적용 |

| 헤더 | 값 | 목적 |
|------|-----|------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HTTPS 강제 (1년) |
| `X-Frame-Options` | `SAMEORIGIN` | 클릭재킹 방지 |
| `X-Content-Type-Options` | `nosniff` | MIME 스니핑 방지 |
| `X-XSS-Protection` | `1; mode=block` | XSS 차단 (구형 브라우저) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer 정보 제한 |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | 불필요 브라우저 기능 차단 |

---

## 6. 기존부터 구현된 보안 기능

| 기능 | 구현 파일 | 내용 |
|------|----------|------|
| PII 필터링 | `lib/security/piiFilter.ts` | 주민번호·전화번호·이메일 등 자동 차단, DB 기록 |
| 비밀번호 해싱 | `lib/auth/session.ts` | bcryptjs salt rounds 10 |
| JWT 세션 | `lib/auth/session.ts` | httpOnly 쿠키 + jose, 7일 만료 |
| 관리자 권한 분리 | `lib/auth/adminAuth.ts` | `requireAdmin()` 함수로 관리자 API 보호 |
| SQL Injection 방지 | `lib/app-db/db.ts` | better-sqlite3 Prepared Statements |
| 공식 AI SDK | `package.json` | OpenAI, Google GenAI 공식 패키지만 사용 |
| 클라이언트 PII 검사 | `lib/security/usePiiSafeInput.ts` | 입력 시점 실시간 개인정보 감지 |
