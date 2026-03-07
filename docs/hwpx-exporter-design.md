# HWPX 동적 보고서 생성기 설계 문서

## 1. 개요

AI가 생성한 보고서 데이터를 한글(HWP) 문서 형식인 `.hwpx`로 동적 변환하여 다운로드하는 기능.
ODT 방식 대비 한글 프로그램에서 서식이 100% 동일하게 재현된다.

---

## 2. 핵심 설계 원칙

### ODT 방식과의 차이

| 항목 | ODT 방식 (`odtExporter.ts`) | HWPX 방식 (`hwpxExporter.ts`) |
|------|----------------------------|-------------------------------|
| 기반 | 스타일을 코드로 직접 정의 | 샘플 HWPX 파일을 템플릿으로 사용 |
| 서식 일치도 | 85% 수준 (렌더링 엔진 차이) | 100% (동일 포맷) |
| 출력 파일 | `.odt` | `.hwpx` |
| 이미지/로고 | fetch 후 삽입 | 템플릿에 내장된 것 그대로 유지 |

### 설계 철학

> 샘플 문서의 **구조(ZIP + XML)**를 재사용하고,
> **내용(section0.xml)**만 AI 데이터로 교체한다.

---

## 3. 파일 구조

```
rsai_ver2/
├── public/
│   └── report-template.hwpx       # 서식 템플릿 (브라우저 fetch 대상)
├── 리포터_샘플.hwpx               # 원본 샘플 (분석용, 소스 역할)
└── lib/work-support/report/
    ├── hwpxExporter.ts             # HWPX 생성기 (신규)
    ├── odtExporter.ts              # ODT 생성기 (유지, 백업)
    └── ReportViewer.tsx            # 다운로드 버튼 → HWPXExporter 사용
```

---

## 4. HWPX 파일 포맷

HWPX는 **ZIP 아카이브** 기반의 XML 포맷이다.

```
report-template.hwpx (ZIP)
├── mimetype                  → "application/hwp+zip"
├── version.xml               → HWP 버전 정보
├── settings.xml              → 문서 설정
├── Contents/
│   ├── content.hpf           → OPF 패키지 매니페스트
│   ├── header.xml            → 스타일/폰트/색상 정의 (변경 안 함)
│   └── section0.xml          → 본문 내용 ← 이 파일만 교체
├── BinData/
│   ├── image1.png            → 로고 이미지 (변경 안 함)
│   └── image2.png
├── Preview/
│   ├── PrvText.txt
│   └── PrvImage.png
└── META-INF/
    ├── container.xml
    ├── container.rdf
    └── manifest.xml
```

**동작 방식:** `Contents/section0.xml` 만 새 내용으로 교체 후 ZIP 재패키징.

---

## 5. 사전 분석 작업 (1회성)

`리포터_샘플.hwpx`를 직접 열어 내부 XML을 분석하여 style ID를 확인했다.
이 값들은 `hwpxExporter.ts`에 **하드코딩**되어 있으며, 템플릿 파일이 바뀌지 않는 한 변경 불필요.

### 5-1. 문자 스타일 (charPrIDRef) — `header.xml` 기준

| ID | 용도 | 크기 | 색상 |
|----|------|------|------|
| 9  | 섹션 번호 셀 텍스트 | 16pt | 흰색 `#FFFFFF` |
| 10 | 섹션 제목 셀 텍스트 | 16pt | 검정 `#000000` |
| 20 | 문서 제목 | 25pt | 검정 (자간 +18) |
| 22 | 요약문 본문 | 14pt | 검정 (자간 -17) |
| 23 | ○ 항목 | 15pt | 검정 (자간 -18) |
| 24 | - 항목 | 14pt | `#1B1B1B` |
| 25 | 표 제목 / 표 헤더 셀 | 14pt | 검정 |
| 26 | 표 데이터 셀 | 12pt | 검정 |

### 5-2. 셀 배경/테두리 스타일 (borderFillIDRef) — `header.xml` 기준

| ID | 용도 | 배경색 | 테두리 |
|----|------|--------|--------|
| 7  | 섹션 번호 셀 | `#505457` (진회색) | 없음 |
| 8  | 섹션 제목 셀 | `#E6E6E7` (연회색) | 없음 |
| 14 | 요약문 셀 | 없음 | 상·하 `#505457` 실선 |
| 15 | 데이터 표 전체 | 없음 | 없음 |
| 16 | 데이터 표 헤더 셀 | `#EAD9F0` (라벤더) | 0.4mm 실선 |
| 17 | 데이터 표 데이터 셀 | 없음 | 0.4mm 실선 |

### 5-3. 단락 스타일 (paraPrIDRef / styleIDRef) — `header.xml` 기준

| paraPrIDRef | styleIDRef | 용도 |
|-------------|------------|------|
| 2  | -  | 가운데 정렬 (섹션 번호 셀 내 단락) |
| 14 | -  | 왼쪽 정렬 (섹션 제목 셀 내 단락) |
| 20 | -  | 양쪽 정렬 (섹션 제목 테이블 외곽 단락) |
| 29 | -  | 요약문 테이블 외곽 단락 |
| 30 | -  | 요약문 셀 내 단락 |
| 31 | 31 | ○ 항목 단락 |
| 32 | 32 | - 항목 단락 |
| 35 | 33 | 표 제목 단락 `[ ... ]` |
| 36 | 35 / 36 | 표 헤더/데이터 셀 내 단락 |

---

## 6. 런타임 동작 흐름

```
보고서 생성 완료
    │
    ▼
[ReportViewer] HWP 다운로드 버튼 클릭
    │
    ▼
[HWPXExporter.export(reportData)]
    │
    ├─① fetch('/report-template.hwpx')
    │       └─ JSZip.loadAsync() → ZIP 열기
    │
    ├─② Contents/section0.xml 읽기 (templateXml)
    │
    ├─③ buildSection0(templateXml, reportData)
    │       ├─ 헤더 블록 추출 (첫 번째 <hp:p> — secPr + 로고 테이블)
    │       │       └─ 문서 제목만 교체 (charPrIDRef="20" 위치)
    │       ├─ buildSummaryPara(summary)
    │       └─ sections.forEach → buildSection(section, num)
    │               ├─ buildSectionTitle(num, title)   → 번호|제목 테이블
    │               ├─ buildBullet(text)               → ○ 항목 단락
    │               ├─ buildSubBullet(text)            → - 항목 단락
    │               └─ buildDataTable(table)           → 헤더+데이터 표
    │
    ├─④ zip.file('Contents/section0.xml', newXml)
    │
    └─⑤ zip.generateAsync({ type: 'blob', mimeType: 'application/hwp+zip' })
            └─ URL.createObjectURL(blob) → a.download = '제목.hwpx'
```

---

## 7. section0.xml 문서 구조

HWP XML의 최상위 요소는 `<hs:sec>` (섹션).
본문의 각 줄/표는 `<hp:p>` (단락) 단위로 표현된다.

```xml
<hs:sec xmlns:hp="..." xmlns:hs="..." ...>

  <!-- ① secPr (페이지 설정) + 헤더 테이블 (로고 + 제목) -->
  <hp:p id="0" paraPrIDRef="20"> ... </hp:p>

  <!-- ② 요약문 테이블 (1행 1열, 상하 테두리) -->
  <hp:p id="0" paraPrIDRef="29"> ... </hp:p>

  <!-- ③ 섹션 제목 테이블 (번호 | 제목) × N -->
  <hp:p id="0" paraPrIDRef="20"> ... </hp:p>

  <!-- ④ ○ 항목 단락 -->
  <hp:p id="0" paraPrIDRef="31" styleIDRef="31"> ... </hp:p>

  <!-- ⑤ - 항목 단락 -->
  <hp:p id="2147483648" paraPrIDRef="32" styleIDRef="32"> ... </hp:p>

  <!-- ⑥ 표 제목 단락 [ ... ] -->
  <hp:p id="0" paraPrIDRef="35" styleIDRef="33"> ... </hp:p>

  <!-- ⑦ 데이터 표 컨테이너 단락 -->
  <hp:p id="2147483648" paraPrIDRef="0" styleIDRef="34"> ... </hp:p>

</hs:sec>
```

### hp:p id 규칙

| id 값 | 의미 |
|-------|------|
| `"0"` | 새로운 단락 그룹의 시작 |
| `"2147483648"` (= `0x80000000`) | 이전 단락과 연속되는 단락 |

---

## 8. linesegarray 처리 방침

`<hp:linesegarray>`는 HWP의 **레이아웃 캐시 데이터**다.
동적 생성 시 정확한 값을 계산할 수 없으므로 **`flags="0"`** 으로 설정하여
HWP가 파일을 열 때 레이아웃을 재계산하도록 유도한다.

```xml
<!-- 예: ○ 항목 단락의 linesegarray -->
<hp:linesegarray>
  <hp:lineseg textpos="0" vertpos="0"
              vertsize="1500" textheight="1500" baseline="1275"
              spacing="556" horzpos="850" horzsize="47478"
              flags="0"/>   <!-- flags=0 → HWP 재계산 유도 -->
</hp:linesegarray>
```

---

## 9. AI 출력 데이터 → HWPX 변환 규칙

| AI 출력 패턴 | 판별 조건 | 변환 결과 |
|-------------|-----------|-----------|
| `"**(...)**  본문"` | `isSubBullet` 아닌 경우 | `○ (...)  본문` (buildBullet) |
| `"SUB: 본문"` | `startsWith('SUB:')` | `- 본문` (buildSubBullet) |
| `"- 본문"` | `/^-\s/.test()` | `- 본문` (buildSubBullet) |
| 이미 `○`로 시작 | `startsWith('○')` | 그대로 사용 |
| 이미 `-`로 시작 | `/^-\s/.test()` | 그대로 사용 |

`cleanText()` 처리: `**bold**` → `bold`, `SUB:` 제거, trim

---

## 10. 페이지 레이아웃 (템플릿 기준)

| 항목 | 값 | cm 환산 |
|------|-----|---------|
| 단위 | HWPUNIT (1cm ≈ 2834.64) | - |
| 페이지 너비 | 59528 | A4 (21cm) |
| 페이지 높이 | 84188 | A4 (29.7cm) |
| 좌 여백 | 5669 | ≈ 2.0cm |
| 우 여백 | 5528 | ≈ 1.95cm |
| 상 여백 | 4251 | ≈ 1.5cm |
| 하 여백 | 4251 | ≈ 1.5cm |
| 본문 유효 너비 | 48331 | ≈ 17.0cm |

---

## 11. 관련 파일

| 파일 | 역할 |
|------|------|
| [hwpxExporter.ts](../lib/work-support/report/hwpxExporter.ts) | HWPX 생성 핵심 로직 |
| [odtExporter.ts](../lib/work-support/report/odtExporter.ts) | 구 ODT 생성기 (백업 유지) |
| [ReportViewer.tsx](../lib/work-support/report/ReportViewer.tsx) | 다운로드 버튼 UI |
| [public/report-template.hwpx](../public/report-template.hwpx) | 서식 템플릿 (런타임 fetch) |
| [리포터_샘플.hwpx](../리포터_샘플.hwpx) | 원본 샘플 (분석 참고용) |
