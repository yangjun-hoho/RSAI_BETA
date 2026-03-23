import JSZip from 'jszip';
import { DocumentNode, TemplateDefinition } from '@/types/work-support2';

export class HWPXRenderer {
  private tblIdBase = (Date.now() % 900000000) + 100000000;
  private tblIdCounter = 0;
  private zOrderCounter = 2;
  private sectionCounter = 0;

  private nextTblId(): number {
    return this.tblIdBase + this.tblIdCounter++;
  }

  private nextZOrder(): number {
    const z = this.zOrderCounter;
    this.zOrderCounter += 2;
    return z;
  }

  // borderFillIDRef ID for table header: light gray fill + black borders (dynamically injected)
  private readonly HEADER_FILL_ID = '18';

  async render(templateBuffer: Buffer, nodes: DocumentNode[], def: TemplateDefinition): Promise<Buffer> {
    const zip = await JSZip.loadAsync(templateBuffer);

    const section0File = zip.file('Contents/section0.xml');
    if (!section0File) throw new Error('템플릿 구조 오류: Contents/section0.xml 없음');
    const templateXml = await section0File.async('string');

    let xml: string;

    if (def.anchor_strategy === 'merit_preserve') {
      // 공적조서 방식: 헤더 고정 + 분야/개요/사항/결론 동적 삽입
      xml = this.renderMeritPreserve(templateXml, nodes);
    } else if (def.anchor_strategy === 'greeting_preserve') {
      // 인사말씀 방식: 헤더 테이블 내 제목 교체 + 인사말 섹션 이후 단락 삽입
      xml = this.renderGreetingPreserve(templateXml, nodes);
    } else if (def.anchor_strategy === 'header_preserve') {
      // 보도자료 방식: 헤더 블록 보존 + 제목/단락 동적 삽입
      xml = this.renderHeaderPreserve(templateXml, nodes);
    } else {
      // 기본 방식: CONTENT_ANCHOR 교체
      // header.xml에 "연한회색 배경 + 검정 테두리" borderFill 추가
      const headerFile = zip.file('Contents/header.xml');
      if (headerFile) {
        let hxml = await headerFile.async('string');
        const newFill =
          `<hh:borderFill id="${this.HEADER_FILL_ID}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">` +
          `<hh:slash type="NONE" Crooked="0" isCounter="0"/>` +
          `<hh:backSlash type="NONE" Crooked="0" isCounter="0"/>` +
          `<hh:leftBorder type="SOLID" width="0.12 mm" color="#000000"/>` +
          `<hh:rightBorder type="SOLID" width="0.12 mm" color="#000000"/>` +
          `<hh:topBorder type="SOLID" width="0.12 mm" color="#000000"/>` +
          `<hh:bottomBorder type="SOLID" width="0.12 mm" color="#000000"/>` +
          `<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>` +
          `<hc:fillBrush><hc:winBrush faceColor="#D9D9D9" hatchColor="#999999" alpha="0"/></hc:fillBrush>` +
          `</hh:borderFill>`;
        hxml = hxml.replace(
          /(<hh:borderFills itemCnt=")(\d+)(")/,
          (_, a, n, b) => `${a}${parseInt(n) + 1}${b}`
        );
        hxml = hxml.replace('</hh:borderFills>', newFill + '</hh:borderFills>');
        zip.file('Contents/header.xml', hxml);
      }

      xml = templateXml;

      const titleNode = nodes.find(n => n.type === 'TITLE');
      if (titleNode) {
        xml = xml.replace(
          /(<hp:run charPrIDRef="20"><hp:t>)[^<]*(<\/hp:t>)/,
          `$1${this.escXml(titleNode.content)}$2`
        );
      }

      const anchorId = def.anchor_id;
      const anchorTextPos = xml.indexOf(anchorId);
      if (anchorTextPos === -1) throw new Error(`템플릿에 앵커(${anchorId})를 찾을 수 없습니다.`);

      const paraStart = xml.lastIndexOf('<hp:p ', anchorTextPos);
      const paraEnd = xml.indexOf('</hp:p>', anchorTextPos) + '</hp:p>'.length;

      const contentNodes = nodes.filter(n => n.type !== 'TITLE');
      const generatedXml = this.generateNodesXml(contentNodes, def);
      xml = xml.substring(0, paraStart) + generatedXml + xml.substring(paraEnd);
    }

    zip.file('Contents/section0.xml', xml);

    const buffer = await zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/hwp+zip' });
    return buffer;
  }

  private renderMeritPreserve(templateXml: string, nodes: DocumentNode[]): string {
    // 헤더 테이블 이후 첫 번째 paraPrIDRef="25" 단락 직전까지 보존
    const bodyMarker = 'paraPrIDRef="25"';
    const bodyIdx = templateXml.indexOf(bodyMarker);
    if (bodyIdx === -1) throw new Error('공적조서 템플릿 구조 오류: 본문 단락(paraPrIDRef=25)을 찾을 수 없습니다.');

    const firstParaStart = templateXml.lastIndexOf('<hp:p ', bodyIdx);
    const headerBlock = templateXml.substring(0, firstParaStart);

    const fieldNode = nodes.find(n => n.type === 'FIELD');
    const summaryNode = nodes.find(n => n.type === 'SUMMARY');
    const detailNode = nodes.find(n => n.type === 'DETAIL');
    const bulletNodes = nodes.filter(n => n.type === 'BULLET');
    const conclusionNode = nodes.find(n => n.type === 'CONCLUSION');

    let result = headerBlock;

    // 분야
    if (fieldNode) {
      result += this.buildMeritPara(fieldNode.content);
      result += this.buildMeritSpacer();
    }

    // 개요 섹션
    result += this.buildMeritPara('■ 공적조서 개요(80자 내외) ');
    if (summaryNode) {
      result += this.buildMeritPara(summaryNode.content);
      result += this.buildMeritSpacer();
    }

    // 사항 섹션
    result += this.buildMeritPara('■ 공적조서 사항(500자 내외) ');
    if (detailNode) {
      result += this.buildMeritPara(detailNode.content);
      result += this.buildMeritSpacer();
    }

    // 세부 성과 항목
    bulletNodes.forEach(node => {
      const content = node.content.startsWith('▢') ? node.content : `▢ ${node.content}`;
      result += this.buildMeritPara(content);
      result += this.buildMeritSpacer();
    });

    // 결론
    if (conclusionNode) {
      result += this.buildMeritPara(conclusionNode.content);
    }

    result += '</hs:sec>';
    return result;
  }

  private buildMeritPara(text: string): string {
    return (
      `<hp:p id="2147483648" paraPrIDRef="25" styleIDRef="31" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="17"><hp:t>${this.escXml(text)}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1400" textheight="1400" baseline="1190" spacing="420" horzpos="0" horzsize="48188" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  private buildMeritSpacer(): string {
    return (
      `<hp:p id="2147483648" paraPrIDRef="25" styleIDRef="31" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="17"/>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1400" textheight="1400" baseline="1190" spacing="420" horzpos="0" horzsize="48188" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  private renderGreetingPreserve(templateXml: string, nodes: DocumentNode[]): string {
    const titleNode = nodes.find(n => n.type === 'TITLE');
    let xml = templateXml;

    // 1. 헤더 테이블 내 제목 교체 (paraPrIDRef="21", charPrIDRef="16")
    if (titleNode) {
      const titleMarker = 'paraPrIDRef="21"';
      const markerIdx = xml.indexOf(titleMarker);
      if (markerIdx !== -1) {
        const paraStart = xml.lastIndexOf('<hp:p ', markerIdx);
        const paraEnd = xml.indexOf('</hp:p>', markerIdx) + '</hp:p>'.length;
        const para = xml.substring(paraStart, paraEnd);
        const newPara = para.replace(/<hp:t>[^<]*<\/hp:t>/, `<hp:t>${this.escXml(titleNode.content)}</hp:t>`);
        xml = xml.substring(0, paraStart) + newPara + xml.substring(paraEnd);
      }
    }

    // 2. "■ 인사말" 섹션 마커(paraPrIDRef="20") 이후부터 교체
    const sectionMarker = 'paraPrIDRef="20"';
    const sectionIdx = xml.indexOf(sectionMarker);
    if (sectionIdx === -1) throw new Error('greeting 템플릿 구조 오류: 인사말 섹션(paraPrIDRef=20)을 찾을 수 없습니다.');

    const sectionParaEnd = xml.indexOf('</hp:p>', sectionIdx) + '</hp:p>'.length;
    const headerBlock = xml.substring(0, sectionParaEnd);

    // 3. 본문 단락 생성
    const paragraphNodes = nodes.filter(n => n.type === 'PARAGRAPH');
    let result = headerBlock;

    paragraphNodes.forEach((node, i) => {
      if (i === 0) {
        result += this.buildGreetingFirstPara(node.content);
      } else {
        result += this.buildGreetingSpacer();
        result += this.buildGreetingBodyPara(node.content);
      }
    });

    result += '</hs:sec>';
    return result;
  }

  private buildGreetingFirstPara(text: string): string {
    const content = /^\s*○/.test(text) ? text : ` ○ ${text}`;
    return (
      `<hp:p id="2147483648" paraPrIDRef="23" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="6"><hp:t>${this.escXml(content)}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1500" textheight="1500" baseline="1275" spacing="1200" horzpos="0" horzsize="48188" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  private buildGreetingSpacer(): string {
    return (
      `<hp:p id="2147483648" paraPrIDRef="26" styleIDRef="30" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="6"/>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1500" textheight="1500" baseline="1275" spacing="1200" horzpos="0" horzsize="48188" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  private buildGreetingBodyPara(text: string): string {
    const content = text.startsWith('    ') ? text : `    ${text}`;
    return (
      `<hp:p id="2147483648" paraPrIDRef="26" styleIDRef="30" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="6"><hp:t>${this.escXml(content)}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1500" textheight="1500" baseline="1275" spacing="1200" horzpos="0" horzsize="48188" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  private renderHeaderPreserve(templateXml: string, nodes: DocumentNode[]): string {
    // 헤더 블록 = 기사 제목 단락(paraPrIDRef="23") 이전의 모든 내용 보존
    const titleParaMarker = '<hp:p id="0" paraPrIDRef="23"';
    const titleParaIdx = templateXml.indexOf(titleParaMarker);
    if (titleParaIdx === -1) throw new Error('보도자료 템플릿 구조 오류: 제목 단락(paraPrIDRef=23)을 찾을 수 없습니다.');

    const headerBlock = templateXml.substring(0, titleParaIdx);

    const titleNode = nodes.find(n => n.type === 'TITLE');
    const paragraphNodes = nodes.filter(n => n.type === 'PARAGRAPH');

    let xml = headerBlock;

    // 기사 제목
    if (titleNode) {
      xml += this.buildPressTitlePara(titleNode.content);
      xml += this.buildPressTitleSpacer();
    }

    // 본문 단락
    paragraphNodes.forEach((node, i) => {
      if (i > 0) xml += this.buildPressBodySpacer();
      xml += this.buildPressBodyPara(node.content, i === 0 ? '0' : '2147483648');
    });

    xml += '</hs:sec>';
    return xml;
  }

  private buildPressTitlePara(text: string): string {
    return (
      `<hp:p id="0" paraPrIDRef="23" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="28"><hp:t>${this.escXml(text)}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="2000" textheight="2000" baseline="1700" spacing="1100" horzpos="0" horzsize="51024" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  private buildPressTitleSpacer(): string {
    return (
      `<hp:p id="0" paraPrIDRef="21" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="5"/>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1400" textheight="1400" baseline="1190" spacing="912" horzpos="0" horzsize="51024" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  private buildPressBodySpacer(): string {
    return (
      `<hp:p id="0" paraPrIDRef="22" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="5"/>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1400" textheight="1400" baseline="1190" spacing="772" horzpos="0" horzsize="51024" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  private buildPressBodyPara(text: string, id: '0' | '2147483648' = '0'): string {
    return (
      `<hp:p id="${id}" paraPrIDRef="22" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="5"><hp:t>${this.escXml(text)}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1400" textheight="1400" baseline="1190" spacing="772" horzpos="0" horzsize="51024" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  private generateNodesXml(nodes: DocumentNode[], def: TemplateDefinition): string {
    this.sectionCounter = 0;
    return nodes.map(node => this.renderNode(node, def)).join('');
  }

  private renderNode(node: DocumentNode, def: TemplateDefinition): string {
    const styleEntry = def.style_map[node.type];

    switch (node.type) {
      case 'TITLE':
        return this.buildTitlePara(node.content, styleEntry as { charPrIDRef: string; paraPrIDRef: string; styleIDRef: string });
      case 'BACKGROUND':
        return this.buildBackgroundPara(node.content);
      case 'SECTION':
        this.sectionCounter++;
        return this.buildSectionTable(this.sectionCounter, node.content);
      case 'SUBSECTION':
        return this.buildBulletPara(node.content, styleEntry as { charPrIDRef: string; paraPrIDRef: string; styleIDRef: string }, '○');
      case 'SUB_DETAIL':
        return this.buildSubBulletPara(node.content, styleEntry as { charPrIDRef: string; paraPrIDRef: string; styleIDRef: string }, '-');
      case 'BULLET':
        return this.buildSubBulletPara(node.content, styleEntry as { charPrIDRef: string; paraPrIDRef: string; styleIDRef: string }, '·');
      case 'TABLE':
        return this.buildDataTable(node);
      default:
        return '';
    }
  }

  private buildTitlePara(content: string, style: { charPrIDRef: string; paraPrIDRef: string; styleIDRef: string }): string {
    return (
      `<hp:p id="0" paraPrIDRef="${style.paraPrIDRef}" styleIDRef="${style.styleIDRef}" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="${style.charPrIDRef}"><hp:t>${this.escXml(content)}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="2500" textheight="2500" baseline="2125" spacing="1500" horzpos="0" horzsize="48328" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  private buildBackgroundPara(content: string): string {
    const id = this.nextTblId();
    const z = this.nextZOrder();
    return (
      `<hp:p id="0" paraPrIDRef="29" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="6">` +
      `<hp:tbl id="${id}" zOrder="${z}" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="1" colCnt="1" cellSpacing="0" borderFillIDRef="3" noAdjust="0">` +
      `<hp:sz width="47624" widthRelTo="ABSOLUTE" height="5030" heightRelTo="ABSOLUTE" protect="0"/>` +
      `<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>` +
      `<hp:outMargin left="283" right="283" top="283" bottom="283"/>` +
      `<hp:inMargin left="510" right="510" top="141" bottom="141"/>` +
      `<hp:tr>` +
      `<hp:tc name="" header="0" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="14">` +
      `<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">` +
      `<hp:p id="2147483648" paraPrIDRef="30" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="22"><hp:t>${this.escXml(content)}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1400" textheight="1400" baseline="1190" spacing="840" horzpos="0" horzsize="46604" flags="0"/></hp:linesegarray>` +
      `</hp:p>` +
      `</hp:subList>` +
      `<hp:cellAddr colAddr="0" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/>` +
      `<hp:cellSz width="47624" height="5030"/>` +
      `<hp:cellMargin left="510" right="510" top="141" bottom="141"/>` +
      `</hp:tc></hp:tr></hp:tbl><hp:t/>` +
      `</hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="5596" textheight="5596" baseline="4757" spacing="376" horzpos="0" horzsize="48328" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  private buildSectionTable(num: number, title: string): string {
    const id = this.nextTblId();
    const z = this.nextZOrder();

    return (
      `<hp:p id="0" paraPrIDRef="20" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="6">` +
      `<hp:tbl id="${id}" zOrder="${z}" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="1" colCnt="2" cellSpacing="0" borderFillIDRef="3" noAdjust="0">` +
      `<hp:sz width="47621" widthRelTo="ABSOLUTE" height="2834" heightRelTo="ABSOLUTE" protect="0"/>` +
      `<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>` +
      `<hp:outMargin left="283" right="283" top="283" bottom="283"/>` +
      `<hp:inMargin left="510" right="510" top="141" bottom="141"/>` +
      `<hp:tr>` +
      // Number cell (dark gray background)
      `<hp:tc name="" header="0" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="7">` +
      `<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">` +
      `<hp:p id="2147483648" paraPrIDRef="2" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="9"><hp:t>${num}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1600" baseline="1360" spacing="960" horzpos="0" horzsize="1812" flags="0"/></hp:linesegarray>` +
      `</hp:p></hp:subList>` +
      `<hp:cellAddr colAddr="0" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/>` +
      `<hp:cellSz width="2834" height="2834"/>` +
      `<hp:cellMargin left="510" right="510" top="141" bottom="141"/>` +
      `</hp:tc>` +
      // Title cell (light gray background)
      `<hp:tc name="" header="0" hasMargin="1" protect="0" editable="0" dirty="0" borderFillIDRef="8">` +
      `<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">` +
      `<hp:p id="2147483648" paraPrIDRef="14" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="10"><hp:t>${this.escXml(title)}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1600" baseline="1360" spacing="960" horzpos="0" horzsize="43424" flags="0"/></hp:linesegarray>` +
      `</hp:p></hp:subList>` +
      `<hp:cellAddr colAddr="1" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/>` +
      `<hp:cellSz width="44787" height="2834"/>` +
      `<hp:cellMargin left="850" right="510" top="141" bottom="141"/>` +
      `</hp:tc>` +
      `</hp:tr></hp:tbl><hp:t/>` +
      `</hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="3400" textheight="3400" baseline="2890" spacing="1200" horzpos="0" horzsize="48328" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  private buildBulletPara(content: string, style: { charPrIDRef: string; paraPrIDRef: string; styleIDRef: string }, prefix: string): string {
    const text = content.startsWith(prefix) ? content : `${prefix} ${content}`;
    return (
      `<hp:p id="0" paraPrIDRef="${style.paraPrIDRef}" styleIDRef="${style.styleIDRef}" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="${style.charPrIDRef}"><hp:t>${this.escXml(text)}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1500" textheight="1500" baseline="1275" spacing="556" horzpos="850" horzsize="47478" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  private buildSubBulletPara(content: string, style: { charPrIDRef: string; paraPrIDRef: string; styleIDRef: string }, prefix = '-'): string {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const text = new RegExp(`^${escaped}\\s`).test(content) ? content : `${prefix} ${content}`;
    return (
      `<hp:p id="2147483648" paraPrIDRef="${style.paraPrIDRef}" styleIDRef="${style.styleIDRef}" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="${style.charPrIDRef}"><hp:t>${this.escXml(text)}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1400" textheight="1400" baseline="1190" spacing="520" horzpos="2268" horzsize="46060" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  private buildDataTable(node: DocumentNode): string {
    const d = node.data;
    if (!d || !d.headers?.length || !d.rows?.length) return '';

    const id = this.nextTblId();
    const z = this.nextZOrder();
    const colCount = d.headers.length;
    const rowCount = d.rows.length + 1; // +1 for header row

    // 전체 너비 47624 (BACKGROUND와 동일)
    const totalWidth = 47624;

    // 첫 번째 열은 더 좁게 (30%), 나머지 균등 분할
    const firstColWidth = colCount > 1 ? Math.floor(totalWidth * 0.3) : totalWidth;
    const restColWidth = colCount > 1 ? Math.floor((totalWidth - firstColWidth) / (colCount - 1)) : 0;
    const getColWidth = (ci: number) => ci === 0 ? firstColWidth : restColWidth;

    const buildCell = (text: string, colAddr: number, rowAddr: number, isHeader: boolean): string => {
      // header: 커스텀 fill ID(18=연한회색+검정테두리), data: 검정테두리(3)
      const borderFill = isHeader ? this.HEADER_FILL_ID : '3';
      // header: black bold(10) center(2), data: body text(22) left(30)
      const charPr = isHeader ? '10' : '22';
      const paraPr = isHeader ? '2' : '30';
      const cw = getColWidth(colAddr);
      return (
        `<hp:tc name="" header="${isHeader ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${borderFill}">` +
        `<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">` +
        `<hp:p id="2147483648" paraPrIDRef="${paraPr}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
        `<hp:run charPrIDRef="${charPr}"><hp:t>${this.escXml(text)}</hp:t></hp:run>` +
        `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1400" textheight="1400" baseline="1190" spacing="840" horzpos="0" horzsize="${cw - 1020}" flags="0"/></hp:linesegarray>` +
        `</hp:p></hp:subList>` +
        `<hp:cellAddr colAddr="${colAddr}" rowAddr="${rowAddr}"/><hp:cellSpan colSpan="1" rowSpan="1"/>` +
        `<hp:cellSz width="${cw}" height="1800"/>` +
        `<hp:cellMargin left="510" right="510" top="141" bottom="141"/>` +
        `</hp:tc>`
      );
    };

    const headerRow =
      `<hp:tr>` +
      d.headers.map((h, ci) => buildCell(h, ci, 0, true)).join('') +
      `</hp:tr>`;

    const dataRows = d.rows.map((row, ri) =>
      `<hp:tr>` +
      d.headers.map((_, ci) => buildCell(row[ci] ?? '', ci, ri + 1, false)).join('') +
      `</hp:tr>`
    ).join('');

    const tableHeight = 1800 * rowCount;

    return (
      // 표 제목 (있을 경우) — 중앙정렬, 굵게, [ ] 감싸기
      (node.content
        ? `<hp:p id="0" paraPrIDRef="2" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
          `<hp:run charPrIDRef="23"><hp:t>[${this.escXml(node.content)}]</hp:t></hp:run>` +
          `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1500" textheight="1500" baseline="1275" spacing="556" horzpos="0" horzsize="48328" flags="0"/></hp:linesegarray>` +
          `</hp:p>`
        : '') +
      // 표 본체
      `<hp:p id="0" paraPrIDRef="29" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="6">` +
      `<hp:tbl id="${id}" zOrder="${z}" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${rowCount}" colCnt="${colCount}" cellSpacing="0" borderFillIDRef="3" noAdjust="0">` +
      `<hp:sz width="${totalWidth}" widthRelTo="ABSOLUTE" height="${tableHeight}" heightRelTo="ABSOLUTE" protect="0"/>` +
      `<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>` +
      `<hp:outMargin left="283" right="283" top="283" bottom="283"/>` +
      `<hp:inMargin left="510" right="510" top="141" bottom="141"/>` +
      headerRow + dataRows +
      `</hp:tbl><hp:t/>` +
      `</hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="${tableHeight + 566}" textheight="${tableHeight + 566}" baseline="${Math.floor((tableHeight + 566) * 0.85)}" spacing="376" horzpos="0" horzsize="48328" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  private escXml(text: string): string {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
