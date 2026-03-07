import JSZip from 'jszip';

/**
 * ============================================================
 * 인사말씀 HWPX 템플릿 기반 생성기
 * ============================================================
 *
 * 동작 방식:
 *   1. /public/greeting-template.hwpx 를 ZIP으로 열어 템플릿 사용
 *   2. header.xml, BinData(이미지), META-INF 등은 그대로 유지
 *   3. Contents/section0.xml 만 새 인사말씀 데이터로 교체
 *      - 헤더 블록(로고 이미지 + 제목 표)은 그대로 보존
 *      - 제목 텍스트만 greetingType으로 동적 교체
 *      - 본문 단락(빈 줄 + 내용)만 동적 생성
 *   4. 결과를 HWPX Blob으로 → 다운로드
 *
 * 핵심 style ID (header.xml 기준 — 변경 금지):
 *   charPrIDRef
 *     6  : 본문 단락  (15pt, 검정 #000000, 행간 넓음)
 *     16 : 제목 텍스트 (22pt, 검정)
 *   paraPrIDRef / styleIDRef
 *     21 / 29 : 제목 단락 (가운데 정렬, 표 셀 내부)
 *     26 / 30 : 본문 단락 (양쪽 정렬, 행간 넓음)
 *
 * 본문 단락 구조 (샘플 기준):
 *   [빈 spacer 단락] → [내용 단락] → [빈 spacer 단락] → [내용 단락] → ...
 * ============================================================
 */

function escXml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function exportGreetingToHWPX(greetingText: string, greetingType: string): Promise<void> {
  // 1. 템플릿 HWPX 로드
  const response = await fetch('/work-support-template/greeting-template.hwpx');
  if (!response.ok) throw new Error('인사말씀 템플릿 파일을 불러올 수 없습니다 (/work-support-template/greeting-template.hwpx).');
  const buffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  // 2. 템플릿 section0.xml 읽기
  const section0File = zip.file('Contents/section0.xml');
  if (!section0File) throw new Error('템플릿 구조 오류: Contents/section0.xml 없음');
  const templateXml = await section0File.async('string');

  // 3. 새 section0.xml 생성 후 교체
  zip.file('Contents/section0.xml', buildSection0(templateXml, greetingText, greetingType));

  // 4. Blob 생성 후 다운로드
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/hwp+zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${greetingType || '인사말씀'}.hwpx`;
  a.click();
  URL.revokeObjectURL(url);
}

// =============================================================================
// section0.xml 생성
// =============================================================================

function buildSection0(template: string, greetingText: string, greetingType: string): string {
  // ── 헤더 블록 추출 ──────────────────────────────────────────────────────────
  // 헤더 블록 = 첫 번째 본문 단락(paraPrIDRef="26" styleIDRef="30") 이전의 모든 내용
  // 로고 이미지 + 제목 표가 포함됨
  const bodyMarker = '<hp:p id="2147483648" paraPrIDRef="26" styleIDRef="30"';
  const bodyMarkerIdx = template.indexOf(bodyMarker);
  if (bodyMarkerIdx === -1) throw new Error('템플릿 구조 오류: 본문 단락(paraPrIDRef=26 styleIDRef=30)을 찾을 수 없습니다.');

  let headerBlock = template.substring(0, bodyMarkerIdx);

  // ── 제목 텍스트 교체 ─────────────────────────────────────────────────────────
  // 헤더 블록 안의 charPrIDRef="16" 런의 hp:t 텍스트를 greetingType으로 교체
  if (greetingType) {
    headerBlock = headerBlock.replace(
      /(<hp:run charPrIDRef="16"><hp:t>)[^<]*(<\/hp:t>)/,
      `$1${escXml(greetingType)}$2`
    );
  }

  // ── 본문 단락 조립 ───────────────────────────────────────────────────────────
  // greetingText를 줄 단위로 분리, 비어있지 않은 줄마다 [spacer + content] 삽입
  const lines = greetingText.split('\n').filter(line => line.trim());

  let xml = headerBlock;
  for (const line of lines) {
    xml += buildBodySpacer();
    xml += buildBodyPara(line);
  }

  xml += '</hs:sec>';
  return xml;
}

// =============================================================================
// 본문 빈 줄 (spacer) — paraPrIDRef="26", styleIDRef="30", 빈 run
// =============================================================================

function buildBodySpacer(): string {
  return (
    `<hp:p id="2147483648" paraPrIDRef="26" styleIDRef="30" pageBreak="0" columnBreak="0" merged="0">` +
    `<hp:run charPrIDRef="6"/>` +
    `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1500" textheight="1500" baseline="1275" spacing="1200" horzpos="0" horzsize="48188" flags="0"/></hp:linesegarray>` +
    `</hp:p>`
  );
}

// =============================================================================
// 본문 내용 단락 — paraPrIDRef="26", styleIDRef="30", charPrIDRef="6", 15pt
// =============================================================================

function buildBodyPara(text: string): string {
  // 샘플과 동일하게 단락 첫 줄에 공백 4칸 들여쓰기 적용
  const indented = text.startsWith(' ') ? text : `    ${text}`;
  return (
    `<hp:p id="2147483648" paraPrIDRef="26" styleIDRef="30" pageBreak="0" columnBreak="0" merged="0">` +
    `<hp:run charPrIDRef="6"><hp:t>${escXml(indented)}</hp:t></hp:run>` +
    `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1500" textheight="1500" baseline="1275" spacing="1200" horzpos="0" horzsize="48188" flags="0"/></hp:linesegarray>` +
    `</hp:p>`
  );
}
