import JSZip from 'jszip';

/**
 * ============================================================
 * HWPX 템플릿 기반 보고서 생성기
 * ============================================================
 *
 * 동작 방식:
 *   1. /public/report-template.hwpx 를 ZIP으로 열어 템플릿 사용
 *   2. header.xml, BinData(이미지), META-INF 등은 그대로 유지
 *   3. Contents/section0.xml 만 새 보고서 데이터로 교체
 *   4. 결과를 HWPX Blob으로 반환 → 다운로드
 *
 * 핵심 style ID (header.xml 기반 — 변경 금지):
 *   charPrIDRef
 *     9  : 섹션 번호 (16pt, 흰색 #FFFFFF)
 *     10 : 섹션 제목 (16pt, 검정 #000000)
 *     20 : 문서 제목  (25pt, 검정, 자간 18)
 *     22 : 요약문    (14pt, 검정, 자간 -17)
 *     23 : ○ 항목   (15pt, 검정, 자간 -18)
 *     24 : - 항목   (14pt, #1B1B1B)
 *     25 : 표 제목 / 표 헤더 (14pt, 검정)
 *     26 : 표 데이터 셀 (12pt, 검정)
 *   borderFillIDRef
 *     7  : 섹션 번호 셀 배경 #505457 (진회색)
 *     8  : 섹션 제목 셀 배경 #E6E6E7 (연회색)
 *     14 : 요약문 셀 (상·하 테두리 #505457, 채움 없음)
 *     15 : 데이터 표 외곽 (테두리 없음)
 *     16 : 데이터 표 헤더 셀 배경 #EAD9F0 (라벤더), 0.4mm 실선
 *     17 : 데이터 표 데이터 셀 (테두리 0.4mm 실선, 채움 없음)
 *   paraPrIDRef / styleIDRef
 *     2  : CENTER 정렬
 *     14 : LEFT 정렬 (섹션 제목 셀)
 *     20 : JUSTIFY
 *     29 : 요약문 외곽 단락
 *     30 : 요약문 셀 내 단락
 *     31 : ○ 항목 단락 (styleIDRef="31")
 *     32 : - 항목 단락 (styleIDRef="32")
 *     35 : 표 제목 단락  (styleIDRef="33")
 *     36 : 표 셀 단락    (styleIDRef="35"/"36")
 * ============================================================
 */

interface Table {
  title?: string;
  headers: string[];
  rows: string[][];
}

interface Section {
  title?: string;
  content?: unknown[];
  subsections?: Array<{ title?: string; content?: unknown[] }>;
  tables?: Table[];
}

interface Metadata {
  generatedAt?: string;
  totalSections?: number | string;
  estimatedReadTime?: string;
}

interface ReportData {
  title?: string;
  summary?: string;
  sections?: Section[];
  metadata?: Metadata;
  managerInfo?: string;     // 예: "정책기획과장 김병기(☎2050)"
  teamLeaderInfo?: string;  // 예: "기획팀장 김연숙(☎2051)"
}

export class HWPXExporter {
  // 문서 내 테이블 ID · zOrder 는 고유해야 하므로 인스턴스 생성 시 초기화
  private tblIdBase = (Date.now() % 900000000) + 100000000; // 9자리 양수
  private tblIdCounter = 0;
  private zOrderCounter = 2; // 헤더 테이블이 0을 사용하므로 2부터

  private nextTblId(): number {
    return this.tblIdBase + this.tblIdCounter++;
  }

  private nextZOrder(): number {
    const z = this.zOrderCounter;
    this.zOrderCounter += 2;
    return z;
  }

  /**
   * ReportData → HWPX Blob 변환 (다운로드용)
   */
  async export(reportData: ReportData): Promise<Blob> {
    // 1. 템플릿 HWPX 로드
    const response = await fetch('/work-support-template/report-template.hwpx');
    if (!response.ok) throw new Error('리포터 템플릿 파일을 불러올 수 없습니다 (/work-support-template/report-template.hwpx).');
    const buffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);

    // 2. 템플릿 section0.xml 읽기
    const section0File = zip.file('Contents/section0.xml');
    if (!section0File) throw new Error('템플릿 구조 오류: Contents/section0.xml 없음');
    const templateXml = await section0File.async('string');

    // 3. 새 section0.xml 생성 후 교체
    zip.file('Contents/section0.xml', this.buildSection0(templateXml, reportData));

    // 4. HWPX Blob 반환
    return zip.generateAsync({ type: 'blob', mimeType: 'application/hwp+zip' });
  }

  // =========================================================================
  // section0.xml 생성
  // =========================================================================

  private buildSection0(template: string, data: ReportData): string {
    // ── <hs:sec ...> 오프닝 태그 추출 (네임스페이스 선언 포함) ───────────────
    // 첫 번째 <hp:p 시작 위치를 기준으로 앞부분을 통째로 사용
    const firstParaIdx = template.indexOf('<hp:p ');
    const secOpen = template.substring(0, firstParaIdx); // "<?xml ...?><hs:sec ...>"

    // ── 헤더 블록 추출: 첫 번째 top-level <hp:p> ─────────────────────────
    // 두 번째 top-level <hp:p> (요약문 컨테이너 paraPrIDRef="29") 이전까지
    const summaryParaMarker = '<hp:p id="0" paraPrIDRef="29"';
    const summaryParaIdx = template.indexOf(summaryParaMarker);
    let headerBlock = template.substring(firstParaIdx, summaryParaIdx);

    // 문서 제목 교체 (charPrIDRef="20" 컨텍스트)
    const title = this.escXml(data.title || '보고서');
    headerBlock = headerBlock.replace(
      /(<hp:run charPrIDRef="20"><hp:t>)[^<]*(<\/hp:t>)/,
      `$1${title}$2`
    );

    // 담당과장/팀장 정보 삽입 (Row 0, Cell 1 — charPrIDRef="19", 빈 run 교체)
    const contactParts: string[] = [];
    if (data.managerInfo?.trim()) contactParts.push(data.managerInfo.trim());
    if (data.teamLeaderInfo?.trim()) contactParts.push(data.teamLeaderInfo.trim());
    if (contactParts.length > 0) {
      const contactText = this.escXml(contactParts.join(' / '));
      headerBlock = headerBlock.replace(
        /<hp:run charPrIDRef="19"\/>/,
        `<hp:run charPrIDRef="19"><hp:t>${contactText}</hp:t></hp:run>`
      );
    }

    // ── 조립 ─────────────────────────────────────────────────────────────
    let xml = secOpen;
    xml += headerBlock;

    if (data.summary) {
      xml += this.buildSummaryPara(data.summary);
    }

    (data.sections || []).forEach((section, i) => {
      xml += this.buildSection(section, i + 1);
    });

    xml += '</hs:sec>';
    return xml;
  }

  // =========================================================================
  // 요약문 테이블 단락
  // =========================================================================

  private buildSummaryPara(text: string): string {
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
      `<hp:run charPrIDRef="22"><hp:t>${this.escXml(text)}</hp:t></hp:run>` +
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

  // =========================================================================
  // 섹션 (제목 테이블 + 본문 + 하위 섹션 + 데이터 표)
  // =========================================================================

  private buildSection(section: Section, num: number): string {
    let xml = this.buildSectionTitle(num, section.title || '');

    // 본문 항목
    if (Array.isArray(section.content)) {
      section.content.forEach(item => {
        if (typeof item !== 'string') return;
        const text = this.cleanText(item);
        if (this.isSubBullet(item)) {
          xml += this.buildSubBullet(text);
        } else {
          xml += this.buildBullet(text);
        }
      });
    }

    // 하위 섹션
    if (Array.isArray(section.subsections)) {
      section.subsections.forEach(sub => {
        if (sub.title) xml += this.buildBullet(this.cleanText(sub.title));
        if (Array.isArray(sub.content)) {
          sub.content.forEach(item => {
            if (typeof item === 'string') xml += this.buildSubBullet(this.cleanText(item));
          });
        }
      });
    }

    // 데이터 표
    if (Array.isArray(section.tables)) {
      section.tables.forEach(t => { xml += this.buildDataTable(t); });
    }

    return xml;
  }

  // =========================================================================
  // 섹션 제목 테이블 (번호 셀 | 제목 셀)
  // =========================================================================

  private buildSectionTitle(num: number, title: string): string {
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

      // ── 번호 셀 (진회색 #505457, 흰 텍스트) ──────────────────────────────
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

      // ── 제목 셀 (연회색 #E6E6E7, 검정 텍스트) ────────────────────────────
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

  // =========================================================================
  // ○ 항목 단락 (paraPrIDRef="31", styleIDRef="31", charPrIDRef="23")
  // =========================================================================

  private buildBullet(text: string): string {
    // AI 출력에 ○가 없으면 앞에 추가
    const t = text.startsWith('○') ? text : `○ ${text}`;
    return (
      `<hp:p id="0" paraPrIDRef="31" styleIDRef="31" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="23"><hp:t>${this.escXml(t)}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1500" textheight="1500" baseline="1275" spacing="556" horzpos="850" horzsize="47478" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  // =========================================================================
  // - 항목 단락 (paraPrIDRef="32", styleIDRef="32", charPrIDRef="24")
  // =========================================================================

  private buildSubBullet(text: string): string {
    // AI 출력에 -가 없으면 앞에 추가
    const t = /^-\s/.test(text) ? text : `- ${text}`;
    return (
      `<hp:p id="2147483648" paraPrIDRef="32" styleIDRef="32" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="24"><hp:t>${this.escXml(t)}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1400" textheight="1400" baseline="1190" spacing="520" horzpos="2268" horzsize="46060" flags="0"/></hp:linesegarray>` +
      `</hp:p>`
    );
  }

  // =========================================================================
  // 데이터 표 (표 제목 + 헤더 행 + 데이터 행)
  // =========================================================================

  private buildDataTable(table: Table): string {
    if (!table.headers?.length) return '';

    const id = this.nextTblId();
    const z = this.nextZOrder();
    const numCols = table.headers.length;
    const TOTAL_WIDTH = 48477; // HWPUNIT (페이지 본문 너비)
    const colW = Math.floor(TOTAL_WIDTH / numCols);
    const lastW = TOTAL_WIDTH - colW * (numCols - 1); // 나머지 오차는 마지막 열에
    const totalRows = 1 + table.rows.length;

    let xml = '';

    // ── 표 제목 단락 [ title ] ─────────────────────────────────────────────
    if (table.title) {
      xml +=
        `<hp:p id="0" paraPrIDRef="35" styleIDRef="33" pageBreak="0" columnBreak="0" merged="0">` +
        `<hp:run charPrIDRef="25"><hp:t>[ ${this.escXml(table.title)} ]</hp:t></hp:run>` +
        `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1400" textheight="1400" baseline="1190" spacing="520" horzpos="0" horzsize="48328" flags="0"/></hp:linesegarray>` +
        `</hp:p>`;
    }

    // ── 표 컨테이너 단락 ───────────────────────────────────────────────────
    xml +=
      `<hp:p id="2147483648" paraPrIDRef="0" styleIDRef="34" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="0">` +
      `<hp:tbl id="${id}" zOrder="${z}" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${totalRows}" colCnt="${numCols}" cellSpacing="0" borderFillIDRef="15" noAdjust="1">` +
      `<hp:sz width="${TOTAL_WIDTH}" widthRelTo="ABSOLUTE" height="9536" heightRelTo="ABSOLUTE" protect="0"/>` +
      `<hp:pos treatAsChar="0" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="1" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="CENTER" vertOffset="0" horzOffset="0"/>` +
      `<hp:outMargin left="0" right="0" top="283" bottom="2834"/>` +
      `<hp:inMargin left="0" right="0" top="0" bottom="0"/>`;

    // ── 헤더 행 (라벤더 배경 #EAD9F0, borderFillIDRef="16") ────────────────
    xml += '<hp:tr>';
    table.headers.forEach((h, ci) => {
      const w = ci === numCols - 1 ? lastW : colW;
      xml += this.buildTableCell(this.escXml(h), ci, 0, w, '16', '25', '36', '35', true);
    });
    xml += '</hp:tr>';

    // ── 데이터 행 (테두리만, 채움 없음, borderFillIDRef="17") ───────────────
    table.rows.forEach((row, ri) => {
      xml += '<hp:tr>';
      row.forEach((cell, ci) => {
        const w = ci === numCols - 1 ? lastW : colW;
        xml += this.buildTableCell(this.escXml(String(cell)), ci, ri + 1, w, '17', '26', '36', '36', false);
      });
      xml += '</hp:tr>';
    });

    xml +=
      `</hp:tbl><hp:t/>` +
      `</hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="9536" textheight="9536" baseline="8106" spacing="0" horzpos="0" horzsize="48328" flags="0"/></hp:linesegarray>` +
      `</hp:p>`;

    return xml;
  }

  /**
   * 표 단일 셀 XML 생성
   * isHeader=true  → borderFill=16 (라벤더), charPr=25 (14pt), 높이 283
   * isHeader=false → borderFill=17 (테두리만), charPr=26 (12pt), 높이 1134
   */
  private buildTableCell(
    text: string,
    col: number, row: number,
    width: number,
    borderFill: string, charPr: string,
    paraPr: string, styleId: string,
    isHeader: boolean
  ): string {
    const innerW  = width - 1134;
    const vsize   = isHeader ? '1400' : '1200';
    const base    = isHeader ? '1190' : '1020';
    const spacing = isHeader ? '520'  : '444';
    const height  = isHeader ? '283'  : '1134';

    return (
      `<hp:tc name="" header="0" hasMargin="1" protect="0" editable="0" dirty="0" borderFillIDRef="${borderFill}">` +
      `<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="TOP" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">` +
      `<hp:p id="2147483648" paraPrIDRef="${paraPr}" styleIDRef="${styleId}" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="${charPr}"><hp:t>${text}</hp:t></hp:run>` +
      `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="${vsize}" textheight="${vsize}" baseline="${base}" spacing="${spacing}" horzpos="0" horzsize="${innerW}" flags="0"/></hp:linesegarray>` +
      `</hp:p></hp:subList>` +
      `<hp:cellAddr colAddr="${col}" rowAddr="${row}"/><hp:cellSpan colSpan="1" rowSpan="1"/>` +
      `<hp:cellSz width="${width}" height="${height}"/>` +
      `<hp:cellMargin left="567" right="567" top="567" bottom="567"/>` +
      `</hp:tc>`
    );
  }

  // =========================================================================
  // 유틸
  // =========================================================================

  /** SUB: 접두사 또는 - 로 시작하는 항목 → 하위 항목으로 처리 */
  private isSubBullet(text: string): boolean {
    const t = text.trim();
    return t.startsWith('SUB:') || /^-\s/.test(t);
  }

  /** 마크다운 서식 제거 */
  private cleanText(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/^SUB:\s*/g, '')
      .trim();
  }

  /** XML 특수문자 이스케이프 */
  private escXml(text: string): string {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
