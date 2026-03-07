import JSZip from 'jszip';

/**
 * ============================================================
 * 보도자료 HWPX 템플릿 기반 생성기
 * ============================================================
 *
 * 동작 방식:
 *   1. /public/press-release-template.hwpx 를 ZIP으로 열어 템플릿 사용
 *   2. header.xml, BinData(이미지), META-INF 등은 그대로 유지
 *   3. Contents/section0.xml 만 새 보도자료 데이터로 교체
 *      - 헤더 블록(자료제공일 표 + 로고+'보도자료' + 연락처 표 + 제공처 표)은 그대로 보존
 *      - 기사 제목 + 본문 단락만 동적 생성
 *   4. 결과를 HWPX Blob으로 반환 → 다운로드
 *
 * 핵심 style ID (header.xml 기준 — 변경 금지):
 *   charPrIDRef
 *     5  : 본문 단락  (14pt, 검정 #000000)
 *     28 : 기사 제목  (20pt, 검정, 자간 -6)
 *   paraPrIDRef
 *     21 : 제목 후 빈 줄 (spacer)
 *     22 : 본문 단락 스타일 (양쪽 정렬, 행간 넓음)
 *     23 : 기사 제목 스타일 (가운데 정렬)
 * ============================================================
 */

export interface PressReleaseSimpleData {
  title?: string;
  paragraphs?: string[];
}

export class PressReleaseHwpxExporter {
  /**
   * 보도자료 데이터를 받아 HWPX Blob을 반환합니다.
   */
  async export(data: PressReleaseSimpleData): Promise<Blob> {
    // 1. 템플릿 HWPX 로드
    const response = await fetch('/work-support-template/press-release-template.hwpx');
    if (!response.ok) throw new Error('보도자료 템플릿 파일을 불러올 수 없습니다 (/work-support-template/press-release-template.hwpx).');
    const buffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);

    // 2. 템플릿 section0.xml 읽기
    const section0File = zip.file('Contents/section0.xml');
    if (!section0File) throw new Error('템플릿 구조 오류: Contents/section0.xml 없음');
    const templateXml = await section0File.async('string');

    // 3. 새 section0.xml 생성 후 교체
    zip.file('Contents/section0.xml', this.buildSection0(templateXml, data));

    // 4. HWPX Blob 반환
    return zip.generateAsync({ type: 'blob', mimeType: 'application/hwp+zip' });
  }

  // =========================================================================
  // section0.xml 생성
  // =========================================================================

  private buildSection0(template: string, data: PressReleaseSimpleData): string {
    // ── <hs:sec ...> 오프닝 + 헤더 블록 추출 ─────────────────────────────
    // 헤더 블록 = 기사 제목 단락(paraPrIDRef="23") 이전의 모든 내용
    // 자료제공일 표, 로고+'보도자료' 표, 연락처 표, 제공처 표가 포함됨
    const titleParaMarker = '<hp:p id="0" paraPrIDRef="23"';
    const titleParaIdx = template.indexOf(titleParaMarker);
    if (titleParaIdx === -1) throw new Error('템플릿 구조 오류: 기사제목 단락(paraPrIDRef=23)을 찾을 수 없습니다.');

    const headerBlock = template.substring(0, titleParaIdx);

    // ── 조립 ─────────────────────────────────────────────────────────────
    let xml = headerBlock;

    // 기사 제목 (charPrIDRef="28", paraPrIDRef="23")
    if (data.title) {
      xml += this.buildTitle(data.title);
      xml += this.buildTitleSpacer(); // 제목 아래 빈 줄 (paraPrIDRef="21")
    }

    // 본문 단락들 (charPrIDRef="5", paraPrIDRef="22")
    // 단락 사이에 빈 줄(paraPrIDRef="22" 빈 단락) 삽입
    const paras = (data.paragraphs || []).filter(p => p && p.trim());
    paras.forEach((p, i) => {
      if (i === 0) {
        xml += this.buildBodyPara(p.trim(), '0');
      } else {
        xml += this.buildBodySpacer(); // 단락 사이 빈 줄
        xml += this.buildBodyPara(p.trim(), '2147483648');
      }
    });

    xml += '</hs:sec>';
    return xml;
  }

  // =========================================================================
  // 기사 제목 단락 (paraPrIDRef="23", charPrIDRef="28", 20pt 가운데 정렬)
  // =========================================================================

  private buildTitle(text: string): string {
    return (
      `<hp:p id="0" paraPrIDRef="23" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="28"><hp:t>${this.escXml(text)}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="2000" textheight="2000" baseline="1700" spacing="1100" horzpos="0" horzsize="51024" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  // =========================================================================
  // 제목 아래 빈 줄 (paraPrIDRef="21", charPrIDRef="5", 빈 run)
  // =========================================================================

  private buildTitleSpacer(): string {
    return (
      `<hp:p id="0" paraPrIDRef="21" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="5"/>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1400" textheight="1400" baseline="1190" spacing="912" horzpos="0" horzsize="51024" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  // =========================================================================
  // 본문 단락 사이 빈 줄 (paraPrIDRef="22", charPrIDRef="5", 빈 run)
  // =========================================================================

  private buildBodySpacer(): string {
    return (
      `<hp:p id="0" paraPrIDRef="22" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="5"/>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1400" textheight="1400" baseline="1190" spacing="772" horzpos="0" horzsize="51024" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  // =========================================================================
  // 본문 단락 (paraPrIDRef="22", charPrIDRef="5", 14pt 양쪽 정렬)
  // =========================================================================

  private buildBodyPara(text: string, id: '0' | '2147483648' = '0'): string {
    return (
      `<hp:p id="${id}" paraPrIDRef="22" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="5"><hp:t>${this.escXml(text)}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1400" textheight="1400" baseline="1190" spacing="772" horzpos="0" horzsize="51024" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  // =========================================================================
  // 유틸
  // =========================================================================

  private escXml(text: string): string {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
