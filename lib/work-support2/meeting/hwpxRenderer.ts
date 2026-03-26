import JSZip from 'jszip';
import { DocumentNode, StyleDef, TemplateDefinition } from '@/types/work-support2';

export class MeetingHWPXRenderer {

  async render(
    templateBuffer: Buffer,
    nodes: DocumentNode[],
    def: TemplateDefinition,
    formData: Record<string, unknown>
  ): Promise<Buffer> {
    const zip = await JSZip.loadAsync(templateBuffer);

    const section0File = zip.file('Contents/section0.xml');
    if (!section0File) throw new Error('템플릿 구조 오류: Contents/section0.xml 없음');
    let xml = await section0File.async('string');

    xml = this.replaceHeaderValues(xml, def, nodes, formData);

    // header_section1_charPr가 있으면 첫 SECTION은 헤더에 교체됐으므로 본문에서 제외
    let bodyNodes = nodes;
    if (def.header_section1_charPr) {
      const firstSectionIdx = nodes.findIndex(n => n.type === 'SECTION');
      if (firstSectionIdx !== -1) {
        bodyNodes = [...nodes.slice(0, firstSectionIdx), ...nodes.slice(firstSectionIdx + 1)];
      }
    }

    xml = this.replaceBodyContent(xml, bodyNodes, def);

    zip.file('Contents/section0.xml', xml);
    return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/hwp+zip' });
  }

  // ──────────────────────────────────────────────
  // 헤더 교체
  // ──────────────────────────────────────────────

  private replaceHeaderValues(
    xml: string,
    def: TemplateDefinition,
    nodes: DocumentNode[],
    formData: Record<string, unknown>
  ): string {
    const dept      = formData.dept      as string || '';
    const phone     = formData.phone     as string || '';
    const docNumber = formData.doc_number as string || '';

    // 부서+연락처: charPr 기반으로 교체
    if (def.header_dept_charPr) {
      const deptText = phone ? `${dept} ☎${phone}` : dept;
      if (dept) xml = this.replaceFirstRunText(xml, def.header_dept_charPr, deptText);
    }

    // 문서번호
    if (def.header_docnum_charPr && docNumber) {
      xml = this.replaceFirstRunText(xml, def.header_docnum_charPr, docNumber);
    }

    // 제목: 해당 para의 모든 run을 단일 run으로 교체
    const titleNode = nodes.find(n => n.type === 'TITLE');
    if (titleNode && def.header_title_paraPr && def.header_title_charPr) {
      xml = this.replaceTitlePara(xml, def.header_title_paraPr, def.header_title_charPr, titleNode.content);
    }

    // 부제목: run + linesegarray 전체 교체 (원본 multi-lineseg 제거 → single lineseg)
    const subtitleNode = nodes.find(n => n.type === 'SUBTITLE');
    if (def.header_subtitle_present && subtitleNode && def.header_subtitle_charPr) {
      xml = this.replaceSubtitlePara(xml, def.header_subtitle_charPr, `◇ ${subtitleNode.content}`);
    }

    // 헤더 안에 내장된 첫 번째 SECTION 교체 (행사1형 등)
    const section1Node = nodes.find(n => n.type === 'SECTION');
    if (def.header_section1_charPr && section1Node) {
      xml = this.replaceFirstRunText(xml, def.header_section1_charPr, section1Node.content);
    }

    return xml;
  }

  /**
   * 특정 charPrIDRef를 가진 첫 번째 run의 텍스트만 교체
   */
  private replaceFirstRunText(xml: string, charPrIDRef: string, newText: string): string {
    const pattern = new RegExp(
      `(<hp:run charPrIDRef="${charPrIDRef}"><hp:t>)[^<]*(</hp:t>)`
    );
    return xml.replace(pattern, `$1${this.escXml(newText)}$2`);
  }

  /**
   * 제목 단락: 중첩 구조를 고려한 para 전체 교체
   * - 해당 paraPrIDRef 단락을 찾아 내부 run을 모두 제거하고 단일 run으로 대체
   * - outer linesegarray(마지막 linesegarray)는 보존
   */
  private replaceTitlePara(xml: string, paraPrIDRef: string, charPrIDRef: string, newTitle: string): string {
    const markerIdx = xml.indexOf(`paraPrIDRef="${paraPrIDRef}"`);
    if (markerIdx === -1) return xml;

    const openTagStart = xml.lastIndexOf('<hp:p ', markerIdx);
    const openTagEnd   = xml.indexOf('>', openTagStart) + 1;
    const paraEnd      = this.findParaEnd(xml, openTagStart);
    if (paraEnd === -1) return xml;

    const paraInner = xml.substring(openTagEnd, paraEnd - '</hp:p>'.length);

    // 가장 마지막 linesegarray를 outer lineseg로 사용
    const lastLsStart = paraInner.lastIndexOf('<hp:linesegarray>');
    const lastLsEnd   = paraInner.lastIndexOf('</hp:linesegarray>') + '</hp:linesegarray>'.length;
    if (lastLsStart === -1) return xml;

    const outerLineseg = paraInner.substring(lastLsStart, lastLsEnd);
    const openTag      = xml.substring(openTagStart, openTagEnd);
    const newRun       = `<hp:run charPrIDRef="${charPrIDRef}"><hp:t>${this.escXml(newTitle)}</hp:t></hp:run>`;

    return (
      xml.substring(0, openTagStart) +
      openTag + newRun + outerLineseg +
      '</hp:p>' +
      xml.substring(paraEnd)
    );
  }

  /**
   * 부제목 셀 단락 교체: charPrIDRef로 단락을 찾아 run + linesegarray 전체를 교체
   * 원본 linesegarray의 multi-lineseg를 single lineseg로 교체하여 HWP 손상 오류 방지
   */
  private replaceSubtitlePara(xml: string, charPrIDRef: string, newSubtitle: string): string {
    const runSearchStr = `charPrIDRef="${charPrIDRef}"><hp:t>`;
    const runIdx = xml.indexOf(runSearchStr);
    if (runIdx === -1) return xml;

    const openTagStart = xml.lastIndexOf('<hp:p ', runIdx);
    const openTagEnd   = xml.indexOf('>', openTagStart) + 1;
    const paraEnd      = this.findParaEnd(xml, openTagStart);
    if (paraEnd === -1) return xml;

    const paraInner = xml.substring(openTagEnd, paraEnd - '</hp:p>'.length);

    // 원본 첫 번째 lineseg 태그에서 치수값 추출
    const lsArrayStart = paraInner.indexOf('<hp:linesegarray>');
    if (lsArrayStart === -1) return xml;
    const firstLsEnd = paraInner.indexOf('/>', lsArrayStart) + 2;
    const firstLsTag = paraInner.substring(lsArrayStart + '<hp:linesegarray>'.length, firstLsEnd);

    // textpos, vertpos를 0으로 초기화한 단일 lineseg로 교체
    const freshLs = firstLsTag
      .replace(/textpos="[^"]*"/, 'textpos="0"')
      .replace(/vertpos="[^"]*"/, 'vertpos="0"');
    const freshLinesegArray = `<hp:linesegarray>${freshLs}</hp:linesegarray>`;

    const openTag = xml.substring(openTagStart, openTagEnd);
    const newRun  = `<hp:run charPrIDRef="${charPrIDRef}"><hp:t>${this.escXml(newSubtitle)}</hp:t></hp:run>`;

    return (
      xml.substring(0, openTagStart) +
      openTag + newRun + freshLinesegArray +
      '</hp:p>' +
      xml.substring(paraEnd)
    );
  }

  /**
   * 중첩 <hp:p>를 고려한 매칭 </hp:p> 위치 반환 (반환값은 </hp:p> 다음 위치)
   */
  private findParaEnd(xml: string, startIdx: number): number {
    let depth = 0, i = startIdx;
    while (i < xml.length) {
      if (xml.startsWith('<hp:p ', i) || xml.startsWith('<hp:p\n', i) || xml.startsWith('<hp:p>', i)) {
        depth++;
        i += 5;
      } else if (xml.startsWith('</hp:p>', i)) {
        depth--;
        if (depth === 0) return i + '</hp:p>'.length;
        i += 7;
      } else {
        i++;
      }
    }
    return -1;
  }

  // ──────────────────────────────────────────────
  // 본문 교체 (2번째 헤더 tbl 이후)
  // ──────────────────────────────────────────────

  private replaceBodyContent(xml: string, nodes: DocumentNode[], def: TemplateDefinition): string {
    const firstTblEnd = xml.indexOf('</hp:tbl>');
    if (firstTblEnd === -1) throw new Error('첫 번째 헤더 테이블을 찾을 수 없습니다');

    const secondTblEnd = xml.indexOf('</hp:tbl>', firstTblEnd + 1);
    if (secondTblEnd === -1) throw new Error('두 번째 헤더 테이블을 찾을 수 없습니다');

    const afterSecondTbl = secondTblEnd + '</hp:tbl>'.length;
    const paraEndAfter   = xml.indexOf('</hp:p>', afterSecondTbl);
    if (paraEndAfter === -1) throw new Error('헤더 이후 단락 끝을 찾을 수 없습니다');

    const headerBlock = xml.substring(0, paraEndAfter + '</hp:p>'.length);
    const bodyNodes   = nodes.filter(n => n.type !== 'TITLE' && n.type !== 'SUBTITLE');
    const bodyXml     = bodyNodes.map(n => this.renderNode(n, def)).join('');

    return headerBlock + bodyXml + '</hs:sec>';
  }

  // ──────────────────────────────────────────────
  // 노드 렌더링
  // ──────────────────────────────────────────────

  private renderNode(node: DocumentNode, def: TemplateDefinition): string {
    const style = def.style_map[node.type] as StyleDef | undefined;
    if (!style) return '';

    switch (node.type) {
      case 'SECTION':     return this.buildSectionPara(node.content, style);
      case 'BULLET':      return this.buildSingleRunPara(node.content, style, '○');
      case 'SUBBULLET':   return this.buildSingleRunPara(node.content, style, '-');
      case 'NOTE':        return this.buildSingleRunPara(node.content, style, '※');
      case 'COOPERATION': return this.buildCooperationPara(node.content, style);
      default:            return '';
    }
  }

  /**
   * SECTION: 두 개의 run
   * Run1: ■ (charPrIDRef - 초록색)
   * Run2: 섹션명 (charPrIDRef2 - 검정색)
   */
  private buildSectionPara(content: string, style: StyleDef): string {
    const bulletRun = `<hp:run charPrIDRef="${style.charPrIDRef}"><hp:t>■ </hp:t></hp:run>`;
    const textRun   = style.charPrIDRef2
      ? `<hp:run charPrIDRef="${style.charPrIDRef2}"><hp:t>${this.escXml(content)}</hp:t></hp:run>`
      : `<hp:run charPrIDRef="${style.charPrIDRef}"><hp:t>${this.escXml(content)}</hp:t></hp:run>`;

    return this.buildPara(style, bulletRun + textRun);
  }

  /**
   * COOPERATION: 세 개의 run
   * Run1: ■ (charPrIDRef - 초록색)
   * Run2: 협조사항: (charPrIDRef2 - 검정 굵게)
   * Run3: 내용 (charPrIDRef3 - 본문체)
   */
  private buildCooperationPara(content: string, style: StyleDef): string {
    const bulletRun = `<hp:run charPrIDRef="${style.charPrIDRef}"><hp:t>■ </hp:t></hp:run>`;
    const labelRun  = style.charPrIDRef2
      ? `<hp:run charPrIDRef="${style.charPrIDRef2}"><hp:t>협조사항: </hp:t></hp:run>`
      : '';
    const contentRun = style.charPrIDRef3
      ? `<hp:run charPrIDRef="${style.charPrIDRef3}"><hp:t>${this.escXml(content)}</hp:t></hp:run>`
      : `<hp:run charPrIDRef="${style.charPrIDRef}"><hp:t>${this.escXml(content)}</hp:t></hp:run>`;

    return this.buildPara(style, bulletRun + labelRun + contentRun);
  }

  /**
   * BULLET / SUBBULLET / NOTE: 단일 run (prefix + 내용)
   */
  private buildSingleRunPara(content: string, style: StyleDef, prefix: string): string {
    const text = `${prefix} ${content}`;
    const run  = `<hp:run charPrIDRef="${style.charPrIDRef}"><hp:t>${this.escXml(text)}</hp:t></hp:run>`;
    return this.buildPara(style, run);
  }

  private buildPara(style: StyleDef, runsXml: string): string {
    const vertsize = style.vertsize ?? '1800';
    const baseline = Math.floor(parseInt(vertsize) * 0.85);
    const spacing  = style.spacing ?? '1080';
    const horzsize = style.horzsize ?? '75684';

    return (
      `<hp:p id="2147483648" paraPrIDRef="${style.paraPrIDRef}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      runsXml +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="${vertsize}" textheight="${vertsize}" baseline="${baseline}" spacing="${spacing}" horzpos="0" horzsize="${horzsize}" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  // ──────────────────────────────────────────────
  // 유틸
  // ──────────────────────────────────────────────

  private escXml(text: string): string {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
