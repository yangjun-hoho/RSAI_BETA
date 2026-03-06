import JSZip from 'jszip';

/**
 * ============================================================
 * [ODT 폰트 적용 주의사항 - 한글(HWP/Hancom Office) 호환]
 * ============================================================
 *
 * 1. 폰트 이름은 반드시 한글 프로그램이 인식하는 이름으로 지정할 것
 *    - ❌ "Malgun Gothic"  → HWP가 인식 못 함 (폰트 칸 공백, 바탕으로 렌더링)
 *    - ✅ "휴먼명조"      → HWP가 정상 인식
 *    - ✅ "Pretendard ExtraBold" → 시스템 미등록 폰트는 이름 그대로 저장되어 정상 표시
 *
 * 2. 폰트 선언은 styles.xml과 content.xml 양쪽에 모두 있어야 함
 *    - ODT 리더(특히 한글)는 두 파일을 독립적으로 파싱하므로
 *      한쪽에만 <office:font-face-decls>를 선언하면 인식 안 될 수 있음
 *
 * 3. ODT 속성 네임스페이스 prefix는 반드시 정확하게 사용할 것
 *    - ❌ font-size="14pt"      → 무시됨 (prefix 없음)
 *    - ✅ fo:font-size="14pt"   → 정상 적용
 *    - ❌ fo:font-name="Arial"  → 존재하지 않는 속성
 *    - ✅ style:font-name="Arial" → 정상 적용
 *
 * 4. 한글(HWP)은 ODT의 <style:default-style>을 무시하고 자체 기본 폰트(바탕)를 적용함
 *    - 해결책: 모든 단락 스타일에 폰트를 상속에 의존하지 않고 명시적으로 지정
 * ============================================================
 */

// ODT 문서에 포함되는 테이블 구조
interface Table {
  title?: string;   // 테이블 제목 (선택)
  headers: string[]; // 헤더 셀 목록
  rows: string[][];  // 데이터 행 목록
}

// 보고서의 각 섹션 구조
interface Section {
  title?: string;           // 섹션 제목
  content?: unknown[];      // 섹션 본문 항목 배열
  subsections?: Array<{ title?: string; content?: unknown[] }>; // 하위 섹션
  tables?: Table[];         // 섹션 내 테이블 목록
}

// 보고서 하단에 표시되는 메타데이터
interface Metadata {
  generatedAt?: string;        // 생성일시 (ISO 문자열)
  totalSections?: number | string; // 총 섹션 수
  estimatedReadTime?: string;  // 예상 읽기 시간
}

// exportToODT 함수에 전달되는 전체 보고서 데이터
interface ReportData {
  title?: string;        // 보고서 제목
  summary?: string;      // 요약문
  sections?: Section[];  // 섹션 배열
  metadata?: Metadata;   // 메타데이터
}

/**
 * ReportData를 ODT(OpenDocument Text) 파일로 변환하는 클래스.
 * JSZip으로 ODT 내부 파일 구조를 직접 생성합니다.
 */
export class ODTExporter {
  private zip: JSZip; // ODT 파일 내부 구조를 담는 ZIP 인스턴스

  constructor() {
    this.zip = new JSZip();
  }

  /**
   * 보고서 데이터를 받아 ODT Blob을 생성하여 반환합니다.
   * 다운로드 링크에 직접 사용할 수 있는 Blob을 반환합니다.
   */
  async exportToODT(reportData: ReportData): Promise<Blob> {
    // 헤더 이미지 로드 (없으면 null)
    let imgArrayBuffer: ArrayBuffer | null = null;
    let imgHeightCm = 2.5;
    try {
      const res = await fetch('/images/document/head-report.png');
      if (res.ok) {
        imgArrayBuffer = await res.arrayBuffer();
        const blob = new Blob([imgArrayBuffer], { type: 'image/png' });
        const bitmap = await createImageBitmap(blob);
        imgHeightCm = parseFloat(((bitmap.height / bitmap.width) * 18).toFixed(3));
        bitmap.close();
      }
    } catch { /* 이미지 없으면 생략 */ }

    this.createODTStructure(!!imgArrayBuffer);
    if (imgArrayBuffer) {
      this.zip.file('Pictures/head-report.png', imgArrayBuffer);
    }
    const content = this.generateContentXML(reportData, !!imgArrayBuffer, imgHeightCm);
    this.zip.file('content.xml', content);
    return await this.zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.oasis.opendocument.text',
    });
  }

  /**
   * ODT 규격에 필요한 기본 파일들을 ZIP에 추가합니다.
   * - mimetype: 파일 형식 선언
   * - META-INF/manifest.xml: 포함된 파일 목록
   * - styles.xml: 문서 스타일 정의
   * - meta.xml: 문서 메타정보
   */
  private createODTStructure(hasImage = false) {
    this.zip.file('mimetype', 'application/vnd.oasis.opendocument.text');
    this.zip.file('META-INF/manifest.xml', this.getManifestXML(hasImage));
    this.zip.file('styles.xml', this.getStylesXML());
    this.zip.file('meta.xml', this.getMetaXML());
  }

  /**
   * 보고서 데이터를 ODT content.xml 문자열로 변환합니다.
   * 순서: 컬러 바 → 제목 → 요약 → 섹션들 → 메타데이터
   */
  private generateContentXML(reportData: ReportData, hasImage = false, imgHeightCm = 2.5): string {
    const title = reportData.title || '보고서';
    const sections = reportData.sections || [];

    // 문서에 등장하는 모든 테이블의 컬럼 수를 수집하여
    // 컬럼 수별로 균등 분배된 동적 스타일을 생성합니다.
    // 예) 3열 테이블 → 각 열 너비 = 18 / 3 = 6cm
    const columnCounts = new Set<number>();
    sections.forEach(section => {
      section.tables?.forEach(table => {
        if (table.headers?.length) columnCounts.add(table.headers.length);
      });
    });
    const dynamicColStyles = Array.from(columnCounts).map(count => {
      const colWidth = (18 / count).toFixed(3); // 전체 18cm를 컬럼 수로 나눔
      return `<style:style style:name="TableCol_${count}" style:family="table-column">
      <style:table-column-properties style:column-width="${colWidth}cm"/>
    </style:style>`;
    }).join('\n    ');

    let content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                        xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                        xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                        xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
                        xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                        xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
                        xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                        xmlns:xlink="http://www.w3.org/1999/xlink">
  <!-- content.xml에도 폰트 선언이 필요: ODT 리더는 styles.xml과 별개로 이 파일에서도 폰트를 검색함 -->
  <office:font-face-decls>
    <style:font-face style:name="Pretendard ExtraBold" svg:font-family="Pretendard ExtraBold" style:font-family-generic="swiss"/>
    <style:font-face style:name="휴먼명조" svg:font-family="휴먼명조" style:font-family-generic="swiss"/>
    <style:font-face style:name="Arial" svg:font-family="Arial" style:font-family-generic="swiss"/>
  </office:font-face-decls>
  <office:automatic-styles>
    ${this.getAutomaticStyles()}
    ${dynamicColStyles}
  </office:automatic-styles>
  <office:body>
    <office:text>`;

    // 문서 최상단 헤더 이미지 (있는 경우)
    if (hasImage) {
      content += `<text:p text:style-name="HeaderImagePara"><draw:frame draw:style-name="fr_header" draw:name="HeaderImage" text:anchor-type="as-char" svg:width="18cm" svg:height="${imgHeightCm}cm"><draw:image xlink:href="Pictures/head-report.png" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></text:p>`;
    }

    // 보고서 제목 + 제목 아래 회색 구분선
    content += `<text:p text:style-name="Official_Title">${this.escapeXML(title)}</text:p>`;
    content += `<text:p text:style-name="Title_Bottom_Line"></text:p>`;

    // 요약문 (있을 경우에만 출력)
    if (reportData.summary) {
      content += `<text:p text:style-name="Official_Summary">◇ ${this.escapeXML(reportData.summary)}</text:p>`;
    }

    // 각 섹션을 XML로 변환하여 순서대로 추가 (1부터 시작하는 번호 전달)
    content += sections.map((section, i) => this.generateSectionXML(section, i + 1)).join('');

    // 문서 하단 메타데이터 블록 (있을 경우에만 출력)
    if (reportData.metadata) {
      content += this.generateMetadataSection(reportData.metadata);
    }

    content += `
    </office:text>
  </office:body>
</office:document-content>`;

    return content;
  }

  /**
   * content.xml 내부에서 사용하는 자동 스타일(테이블, 컬러 바 등)을 반환합니다.
   * styles.xml의 named 스타일과 달리, 이 스타일들은 문서 내부에서만 사용됩니다.
   *
   * ── 섹션 제목 테이블 미세 조정 가이드 ──────────────────────────────────
   * 구조: [번호 셀 | 제목 셀] 2열 1행 테이블
   *
   * [SectionTitle_Table] 테이블 전체
   *   style:width      = "18.000cm"  — 전체 너비 (A열+B열 합과 반드시 일치)
   *   table:align      = "left"      — 정렬 (center로 변경 가능)
   *   fo:margin-top    = "0.500cm"   — 테이블 위 여백 (이전 요소와의 간격, 늘리면 더 떨어짐)
   *   fo:margin-bottom = "0.100cm"   — 테이블 아래 여백
   *   border-model     = collapsing  — 셀 간 이중 선 방지
   *
   * [SectionTitle_Table.A] A열 = 번호 열
   *   style:column-width = "1.412cm"   — 좁게: 1.0cm / 넓게: 2.0cm
   *   ※ 변경 시 B열도 함께 조정 (A열 + B열 = 17.800cm)
   *
   * [SectionTitle_Table.B] B열 = 제목 열
   *   style:column-width = "16.388cm"  — = 17.800 - A열 너비
   *
   * [SectionTitle_Table.Row] 행
   *   min-row-height   = "0.099cm"  — 최소 높이 (실제는 폰트·패딩으로 자동 결정)
   *   fo:keep-together = "auto"     — 행 분리 허용 (always: 항상 같은 페이지)
   *
   * [SectionTitle_Table.NumCell] 번호 셀
   *   fo:background-color = "#4f5357"            — 배경(진회색). 밝게: #6b7280 / 어둡게: #2d2f31
   *   fo:border           = "0.012cm solid #000000" — 테두리 두께·색상
   *   fo:padding-top/bottom = "0.050cm"          — 상하 내부 여백
   *   fo:padding-left/right = "0.180cm"          — 좌우 내부 여백
   *
   * [SectionTitle_Table.TitleCell] 제목 셀
   *   fo:background-color = "#e6e6e7"  — 배경(연회색). 밝게: #f5f5f5 / 어둡게: #c0c0c0
   *   (나머지 속성은 NumCell과 동일)
   *
   * [SectionTitle_NumPara] 번호 셀 내 단락
   *   fo:line-height    = "60%"      — 줄 높이. 100%: 정상 / 낮출수록 텍스트 위로 올라감
   *   fo:margin-top     = "0.200cm"  — 단락 위 여백 (셀 패딩과 합산됨)
   *   fo:margin-bottom  = "0.100cm"  — 단락 아래 여백
   *   fo:font-size      = "20.00pt"  — 번호 글자 크기 (작게: 16pt / 크게: 28pt)
   *   fo:color          = "#ffffff"  — 글자색(흰색). 검정: #000000
   *   style:font-name   = "휴먼명조" — 폰트 (변경 시 asian 속성도 함께 수정)
   *   fo:letter-spacing = "0.00pt"  — 자간. 넓게: 1.00pt / 좁게: -0.50pt
   *
   * [SectionTitle_TitlePara] 제목 셀 내 단락
   *   fo:line-height    = "73%"      — NumPara와 동일하게 유지해야 행 높이 균일
   *   fo:font-size      = "22.00pt"  — 제목 글자 크기
   *   fo:color 없음                  — 기본 검정색 (추가: fo:color="#000000")
   * ─────────────────────────────────────────────────────────────────────
   */
  private getAutomaticStyles(): string {
    return `
    <!-- 헤더 이미지 프레임 스타일 -->
    <style:style style:name="fr_header" style:family="graphic">
      <style:graphic-properties fo:margin-left="0cm" fo:margin-right="0cm" fo:margin-top="0cm" fo:margin-bottom="0cm" style:horizontal-pos="center" style:horizontal-rel="page-content"/>
    </style:style>
    <!-- 헤더 이미지 단락 스타일 -->
    <style:style style:name="HeaderImagePara" style:family="paragraph">
      <style:paragraph-properties fo:text-align="center" fo:margin-top="0cm" fo:margin-bottom="0cm"/>
    </style:style>
    <!-- 본문 테이블: 전체 너비 18cm, 중앙 정렬 -->
    <style:style style:name="Official_Table" style:family="table">
      <style:table-properties style:width="18cm" table:align="center" fo:margin-top="0.1cm" fo:margin-bottom="1cm"/>
    </style:style>
    <!-- 헤더 행 높이 -->
    <style:style style:name="Official_Table.1" style:family="table-row">
      <style:table-row-properties style:min-row-height="0.1cm"/>
    </style:style>
    <!-- 데이터 행 높이 -->
    <style:style style:name="Official_Table.2" style:family="table-row">
      <style:table-row-properties style:min-row-height="0.4cm"/>
    </style:style>
    <!-- 헤더 셀: 회색 배경 + 테두리 -->
    <style:style style:name="Official_Table.A1" style:family="table-cell">
      <style:table-cell-properties fo:padding="0.2cm" fo:border="1pt solid #000000" fo:background-color="#ead9f0"/>
    </style:style>
    <!-- 데이터 셀: 흰 배경 + 테두리 -->
    <style:style style:name="Official_Table.A2" style:family="table-cell">
      <style:table-cell-properties fo:padding="0.2cm" fo:border="1pt solid #000000"/>
    </style:style>
    <!-- 섹션 제목 테이블: 번호(진회색) + 제목(연회색) 2열 구조 -->
    <style:style style:name="SectionTitle_Table" style:family="table">
      <style:table-properties style:width="18.000cm" table:align="left" fo:margin-top="0.500cm" fo:margin-bottom="0.000cm" fo:margin-left="0cm" fo:margin-right="0cm" style:shadow="none" style:may-break-between-rows="false" table:border-model="collapsing"/>
    </style:style>
    <!-- A열: 번호 열 너비 (기본 1.2cm, B열과 합이 18.000cm가 되어야 함) -->
    <style:style style:name="SectionTitle_Table.A" style:family="table-column">
      <style:table-column-properties style:column-width="1.2cm"/>
    </style:style>
    <!-- B열: 제목 열 너비 (기본 16.8cm = 18.000 - 1.2) -->
    <style:style style:name="SectionTitle_Table.B" style:family="table-column">
      <style:table-column-properties style:column-width="16.8cm"/>
    </style:style>
    <!-- 행: 최소 높이 (실제 높이는 폰트·패딩에 따라 자동 결정) -->
    <style:style style:name="SectionTitle_Table.Row" style:family="table-row">
      <style:table-row-properties style:min-row-height="0.099cm" fo:keep-together="auto"/>
    </style:style>
    <!-- 번호 셀: 진회색 배경 #4f5357, 테두리, 패딩 -->
    <style:style style:name="SectionTitle_Table.NumCell" style:family="table-cell">
      <style:table-cell-properties style:vertical-align="middle" style:shadow="none" fo:background-color="#4f5357" fo:border="0.012cm solid #000000" fo:padding-top="0.050cm" fo:padding-bottom="0.050cm" fo:padding-left="0.180cm" fo:padding-right="0.180cm"/>
    </style:style>
    <!-- 제목 셀: 연회색 배경 #e6e6e7, 테두리, 패딩 -->
    <style:style style:name="SectionTitle_Table.TitleCell" style:family="table-cell">
      <style:table-cell-properties style:vertical-align="middle" style:shadow="none" fo:background-color="#e6e6e7" fo:border="0.012cm solid #000000" fo:padding-top="0.050cm" fo:padding-bottom="0.050cm" fo:padding-left="0.180cm" fo:padding-right="0.180cm"/>
    </style:style>
    <!-- 번호 텍스트: 중앙 정렬, 흰색 18pt 휴먼명조 bold, line-height=60% -->
    <style:style style:name="SectionTitle_NumPara" style:family="paragraph">
      <style:paragraph-properties fo:line-height="60%" fo:text-align="center" fo:margin-top="0.100cm" fo:margin-bottom="0.100cm" fo:border="none"/>
      <style:text-properties style:font-name="휴먼명조" style:font-name-asian="휴먼명조" fo:font-size="18.00pt" style:font-size-asian="20.00pt" fo:font-weight="bold" style:font-weight-asian="bold" fo:color="#ffffff" fo:letter-spacing="0.00pt" style:letter-kerning="false"/>
    </style:style>
    <!-- 제목 텍스트: 좌정렬, 18pt 휴먼명조 bold, line-height=73% -->
    <style:style style:name="SectionTitle_TitlePara" style:family="paragraph">
      <style:paragraph-properties fo:line-height="73%" fo:text-align="start" fo:margin-top="0.100cm" fo:margin-bottom="0.100cm" fo:border="none"/>
      <style:text-properties style:font-name="휴먼명조" style:font-name-asian="휴먼명조" fo:font-size="18.00pt" style:font-size-asian="18.00pt" fo:letter-spacing="0.00pt" style:letter-kerning="false"/>
    </style:style>
`;
  }

  /**
   * 섹션 하나를 ODT XML로 변환합니다.
   * 섹션 제목 → 본문 내용 → 하위 섹션 → 테이블 순으로 출력합니다.
   *
   * 본문 항목 앞에 붙는 bullet 규칙:
   *  - 'SUB:' 로 시작하면 들여쓰기 본문 (- 기호)
   *  - '**(...)**' 패턴이면 소제목 (○ 기호)
   *  - 그 외는 일반 본문
   */
  private generateSectionXML(section: Section, sectionNum = 1): string {
    let xml = '';

    /*
     * ── 섹션 제목 테이블 XML 구조 ────────────────────────────────────────
     *
     * <table:table> ← 테이블 시작. table:name은 문서 내 고유해야 하므로 sectionNum 사용
     *   <table:table-column/>  ← A열(번호 열) 너비 선언 (style:column-width="1.412cm")
     *   <table:table-column/>  ← B열(제목 열) 너비 선언 (style:column-width="16.388cm")
     *   <table:table-header-rows>  ← 머리글 행으로 선언 (페이지 넘어가도 반복 출력됨)
     *     <table:table-row>        ← 실제 행 1개
     *       <table:table-cell>     ← A열 셀 (진회색 배경 #4f5357, 흰 텍스트)
     *         <text:p>숫자</text:p>  ← 섹션 번호 (1, 2, 3 …)
     *       </table:table-cell>
     *       <table:table-cell>     ← B열 셀 (연회색 배경 #e6e6e7)
     *         <text:p>제목</text:p>  ← 섹션 제목 텍스트 (앞에 공백 1칸 추가)
     *       </table:table-cell>
     *     </table:table-row>
     *   </table:table-header-rows>
     * </table:table>
     *
     * ■ 번호/제목 열 순서를 바꾸려면:
     *   table:table-column 선언 순서와 table:table-cell 순서를 같이 바꿀 것
     * ■ 번호를 숫자 대신 다른 기호로 바꾸려면:
     *   아래 ${sectionNum} 부분을 원하는 텍스트로 교체 (예: '■', '▶')
     * ■ 제목 앞 공백을 제거하려면:
     *   TitlePara 부분의 ` ${...}` 에서 공백 제거
     * ─────────────────────────────────────────────────────────────────── */

    // 테이블 시작 — table:name은 문서 내 중복 불가이므로 섹션 번호로 구분
    xml += `<table:table table:name="SectionTitle_${sectionNum}" table:style-name="SectionTitle_Table">`;

    // A열(번호 열) 선언 — 너비: SectionTitle_Table.A (기본 1.412cm)
    xml += `<table:table-column table:style-name="SectionTitle_Table.A"/>`;
    // B열(제목 열) 선언 — 너비: SectionTitle_Table.B (기본 16.388cm)
    xml += `<table:table-column table:style-name="SectionTitle_Table.B"/>`;

    // 머리글 행으로 감싸기 (페이지가 바뀌어도 반복 출력; 원치 않으면 table:table-header-rows 제거)
    xml += `<table:table-header-rows>`;
    xml += `<table:table-row table:style-name="SectionTitle_Table.Row">`;

    // A열 셀: 진회색 배경(#4f5357), 흰 텍스트, 섹션 번호 표시
    xml += `<table:table-cell table:style-name="SectionTitle_Table.NumCell" office:value-type="string">`;
    xml += `<text:p text:style-name="SectionTitle_NumPara">${sectionNum}</text:p>`;  // ← 번호 (1,2,3…)
    xml += `</table:table-cell>`;

    // B열 셀: 연회색 배경(#e6e6e7), 섹션 제목 표시 (앞에 공백 1칸으로 좌측 여백 확보)
    xml += `<table:table-cell table:style-name="SectionTitle_Table.TitleCell" office:value-type="string">`;
    xml += `<text:p text:style-name="SectionTitle_TitlePara"> ${this.escapeXML(section.title || '제목 없음')}</text:p>`;
    xml += `</table:table-cell>`;

    xml += `</table:table-row>`;
    xml += `</table:table-header-rows>`;
    xml += `</table:table>`;

    // 섹션 제목 테이블과 본문 사이 간격 (Section_Spacer: margin-bottom="0.2cm")
    // 간격을 더 넓히려면 styles.xml 의 Section_Spacer 스타일에서 fo:margin-bottom 값을 키울 것
    xml += `<text:p text:style-name="Section_Spacer"></text:p>`;

    // 본문 항목 처리
    if (section.content && Array.isArray(section.content)) {
      section.content.forEach(item => {
        if (item && typeof item === 'string') {
          const cleaned = this.cleanTextFormatting(item);
          let styleName = 'Official_Content';
          let bullet = '';
          // 'SUB:' 접두사 → 들여쓰기 본문
          if (item.trim().startsWith('SUB:')) {
            styleName = 'Official_Subsection_Content';
            bullet = '- ';
          // '**(...)**' 패턴 → 소제목
          } else if (/^\*\*\(.*?\)\*\*/.test(item.trim())) {
            styleName = 'Official_Subsection';
            bullet = '○ ';
          }
          xml += `<text:p text:style-name="${styleName}">${bullet}${this.escapeXML(cleaned)}</text:p>`;
        }
      });
    }

    // 하위 섹션 처리
    if (section.subsections && Array.isArray(section.subsections)) {
      section.subsections.forEach(subsection => {
        xml += `<text:p text:style-name="Official_Subsection">${this.escapeXML(subsection.title || '제목 없음')}</text:p>`;
        if (subsection.content && Array.isArray(subsection.content)) {
          subsection.content.forEach(item => {
            if (item && typeof item === 'string') {
              xml += `<text:p text:style-name="Official_Subsection_Content">${this.escapeXML(this.cleanTextFormatting(item))}</text:p>`;
            }
          });
        }
      });
    }

    // 테이블 처리
    if (section.tables && Array.isArray(section.tables)) {
      section.tables.forEach((table, tableIndex) => {
        xml += this.generateTableXML(table, tableIndex);
      });
    }

    return xml;
  }

  /**
   * 마크다운 서식 기호를 제거하여 ODT에 삽입할 순수 텍스트로 변환합니다.
   * - **bold** → bold
   * - SUB: 접두사 제거
   */
  private cleanTextFormatting(text: string): string {
    if (!text) return '';
    const cleaned = text
      .replace(/\*\*(.*?)\*\*/g, '$1') // **굵게** 제거
      .replace(/SUB:\s*/g, '')         // SUB: 접두사 제거
      .trim();
    return cleaned || text.trim();
  }

  /**
   * 테이블 데이터를 ODT 테이블 XML로 변환합니다.
   * 컬럼 너비는 동적 스타일 TableCol_{n}을 사용하여 18cm 균등 분배됩니다.
   * 구조: 테이블 제목 → 헤더 행(회색) → 데이터 행들
   */
  private generateTableXML(table: Table, tableIndex = 0): string {
    if (!table.headers || !table.rows) return '';

    let xml = '';

    // 테이블 제목 (있을 경우에만)
    if (table.title) {
      xml += `<text:p text:style-name="Table_Title">[ ${this.escapeXML(table.title)} ]</text:p>`;
    }

    const numCols = table.headers.length;
    xml += `<table:table table:name="Official_Table${tableIndex}" table:style-name="Official_Table">`;

    // 각 열에 동적 스타일 적용 (TableCol_2, TableCol_3 등)
    for (let i = 0; i < numCols; i++) {
      xml += `<table:table-column table:style-name="TableCol_${numCols}"/>`;
    }

    // 헤더 행
    xml += `<table:table-row table:style-name="Official_Table.1">`;
    table.headers.forEach(header => {
      xml += `<table:table-cell table:style-name="Official_Table.A1" office:value-type="string">`;
      xml += `<text:p text:style-name="Official_Table_Header">${this.escapeXML(header)}</text:p>`;
      xml += `</table:table-cell>`;
    });
    xml += `</table:table-row>`;

    // 데이터 행들
    table.rows.forEach(row => {
      xml += `<table:table-row table:style-name="Official_Table.2">`;
      row.forEach(cell => {
        xml += `<table:table-cell table:style-name="Official_Table.A2" office:value-type="string">`;
        xml += `<text:p text:style-name="Official_Table_Cell">${this.escapeXML(String(cell))}</text:p>`;
        xml += `</table:table-cell>`;
      });
      xml += `</table:table-row>`;
    });

    xml += `</table:table>`;
    return xml;
  }

  /**
   * 문서 하단에 메타데이터(생성일시, 총 섹션 수, 예상 읽기 시간)를 한 행으로 출력합니다.
   * 각 항목은 ' | '로 구분되며, 끝에 '스마트도시과'가 표시됩니다.
   */
  private generateMetadataSection(metadata: Metadata): string {
    const parts: string[] = [];
    if (metadata.generatedAt) {
      parts.push(`○ 생성일시: ${this.formatDate(metadata.generatedAt)}`);
    }
    if (metadata.totalSections) {
      parts.push(`❌○ 총 섹션: ${metadata.totalSections}개`);
    }
    if (metadata.estimatedReadTime) {
      parts.push(`❌○ 예상 읽기 시간: ${metadata.estimatedReadTime}`);
    }
    parts.push(' ❌ 스마트도시과');
    const line = parts.join('      ');
    return `<text:p text:style-name="Metadata_Separator"></text:p><text:p text:style-name="Metadata">${this.escapeXML(line)}</text:p>`;
  }

  /**
   * XML 특수문자를 이스케이프하여 문서가 깨지지 않도록 처리합니다.
   * & → &amp;, < → &lt;, > → &gt;, " → &quot;, ' → &apos;
   */
  private escapeXML(text: string): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * ISO 날짜 문자열을 한국어 형식으로 변환합니다.
   * 예: "2024-01-15T09:30:00.000Z" → "2024. 01. 15. 오전 09:30"
   * 변환 실패 시 원본 문자열을 그대로 반환합니다.
   */
  private formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateString; // 파싱 실패 시 원본 반환
    }
  }

  /**
   * ODT 규격의 manifest.xml을 반환합니다.
   * 문서에 포함된 파일 목록과 각 파일의 MIME 타입을 선언합니다.
   */
  private getManifestXML(hasImage = false): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
  <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="meta.xml"/>
  ${hasImage ? '<manifest:file-entry manifest:media-type="image/png" manifest:full-path="Pictures/head-report.png"/>' : ''}
</manifest:manifest>`;
  }

  /**
   * ODT 문서의 스타일 정의 파일(styles.xml)을 반환합니다.
   *
   * 주요 스타일 목록:
   * - Official_Title: 제목 (Pretendard ExtraBold, 22pt, 중앙 정렬)
   * - Title_Bottom_Line: 제목 아래 회색 구분선
   * - Official_Summary: 요약문 (회색 배경, 휴먼명조, 14pt)
   * - Official_Section_Title: 섹션 제목 (Pretendard ExtraBold, 16pt, 하단 경계선)
   * - Official_Content: 일반 본문 (휴먼명조, 14pt)
   * - Official_Subsection: 소제목 (휴먼명조, 15pt, fo:letter-spacing="-0.05cm")
   * - Official_Subsection_Content: 들여쓰기 본문 (휴먼명조, 14pt)
   * - Official_Table_Header / Cell: 테이블 헤더/셀 텍스트  (휴먼명조, 14pt, 굵게)
   * - Metadata: 하단 메타데이터 텍스트
   * - 페이지: A4 (21×29.7cm), 여백 1.5cm
   */
  private getStylesXML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                       xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                       xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                       xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
                       xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                       xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0">

  <office:font-face-decls>
    <!-- 제목에 사용할 Pretendard ExtraBold 폰트 선언 -->
    <style:font-face style:name="Pretendard ExtraBold" svg:font-family="Pretendard ExtraBold" style:font-family-generic="swiss"/>
    <!-- 한글 본문/요약문에 사용할 휴먼명조 선언 (Windows 기본 내장) -->
    <style:font-face style:name="휴먼명조" svg:font-family="휴먼명조" style:font-family-generic="swiss"/>
    <!-- 영문 기본 폰트 선언 -->
    <style:font-face style:name="Arial" svg:font-family="Arial" style:font-family-generic="swiss"/>
  </office:font-face-decls>

  <!-- 개요 번호 매김 비활성화 (기본 번호 없이 사용) -->
  <office:outline-style>
    <text:outline-level-style text:level="1" style:num-format=""/>
    <text:outline-level-style text:level="2" style:num-format=""/>
    <text:outline-level-style text:level="3" style:num-format=""/>
    <text:outline-level-style text:level="4" style:num-format=""/>
    <text:outline-level-style text:level="5" style:num-format=""/>
    <text:outline-level-style text:level="6" style:num-format=""/>
    <text:outline-level-style text:level="7" style:num-format=""/>
    <text:outline-level-style text:level="8" style:num-format=""/>
    <text:outline-level-style text:level="9" style:num-format=""/>
    <text:outline-level-style text:level="10" style:num-format=""/>
  </office:outline-style>

  <office:styles>
    <!-- 문서 기본 폰트: Arial (영문), Noto Sans CJK KR (한글), 11pt -->
    <style:default-style style:family="paragraph">
      <style:paragraph-properties style:text-autospace="ideograph-alpha"
                                 style:punctuation-wrap="simple"
                                 style:line-break="strict"/>
      <style:text-properties style:font-name="Arial"
                           fo:font-size="11pt"
                           style:font-name-asian="휴먼명조"/>
    </style:default-style>

    <!-- 보고서 제목: Pretendard ExtraBold 22pt bold, 중앙 정렬 -->
    <style:style style:name="Official_Title" style:family="paragraph">
      <style:paragraph-properties fo:line-height="100%" fo:text-align="center"
                                  fo:margin-left="0.000cm" fo:margin-right="0.000cm" fo:text-indent="0.000cm"
                                  fo:margin-top="0.200cm" fo:margin-bottom="0.100cm"
                                  fo:border="none" style:shadow="none"
                                  style:text-autospace="ideograph-alpha" style:line-break="strict"
                                  style:vertical-align="auto" style:snap-to-layout-grid="true"/>
      <style:text-properties style:font-name="Pretendard ExtraBold" style:font-name-asian="Pretendard ExtraBold"
                             style:font-name-complex="Pretendard ExtraBold"
                             fo:font-family="Pretendard ExtraBold"
                             style:font-family-asian="Pretendard ExtraBold"
                             style:font-family-complex="Pretendard ExtraBold"
                             fo:font-size="22.00pt" style:font-size-asian="22.00pt" style:font-size-complex="22.00pt"
                             fo:letter-spacing="0.00pt"
                             fo:font-weight="bold" style:font-weight-asian="bold" style:font-weight-complex="bold"
                             style:letter-kerning="false"/>
    </style:style>

    <!-- 제목 아래 회색 구분선 (높이를 최소화하여 얇은 선처럼 보임) -->
    <style:style style:name="Title_Bottom_Line" style:family="paragraph">
      <style:paragraph-properties fo:border-top="4pt solid #999999"
                                  fo:border-bottom="none" fo:border-left="none" fo:border-right="none"
                                  fo:margin-top="0cm" fo:margin-bottom="1cm"
                                  fo:padding="0cm" fo:line-height="0.1cm"/>
      <style:text-properties fo:font-size="2pt"/>
    </style:style>

    <!-- 요약문: 연한 회색 배경, 상하 검정 테두리, 14pt -->
    <style:style style:name="Official_Summary" style:family="paragraph">
      <style:paragraph-properties fo:background-color="#fcfcfcff"
                                  fo:padding-left="0.5cm" fo:padding-right="0.5cm"
                                  fo:padding-top="0.15cm" fo:padding-bottom="0.15cm"
                                  fo:margin-top="0.3cm" fo:margin-bottom="0.3cm"
                                  fo:border-top="1pt solid #000000" fo:border-bottom="1pt solid #000000"
                                  fo:border-left="none" fo:border-right="none"/>
      <style:text-properties style:font-name="휴먼명조" style:font-name-asian="휴먼명조" fo:font-size="14pt" fo:color="#000000ff"/>
    </style:style>

    <!-- 섹션 제목: Pretendard ExtraBold 16pt bold, 하단 경계선 0.04cm -->
    <style:style style:name="Official_Section_Title" style:family="paragraph">
      <style:paragraph-properties fo:line-height="100%" fo:text-align="justify"
                                  fo:margin-left="0.000cm" fo:margin-right="0.000cm" fo:text-indent="0.000cm"
                                  fo:margin-top="1.200cm" fo:margin-bottom="0.100cm"
                                  fo:border-top="none" fo:border-bottom="0.04cm solid #cccccc"
                                  fo:border-left="none" fo:border-right="none"
                                  style:shadow="none" style:text-autospace="ideograph-alpha"
                                  style:line-break="strict" style:vertical-align="auto"
                                  style:snap-to-layout-grid="true"/>
      <style:text-properties style:font-name="Pretendard ExtraBold" style:font-name-asian="Pretendard ExtraBold"
                             style:font-name-complex="Pretendard ExtraBold"
                             fo:font-family="Pretendard ExtraBold"
                             style:font-family-asian="Pretendard ExtraBold"
                             style:font-family-complex="Pretendard ExtraBold"
                             fo:font-size="16.00pt" style:font-size-asian="16.00pt" style:font-size-complex="16.00pt"
                             fo:letter-spacing="0.00pt"
                             fo:font-weight="bold" style:font-weight-asian="bold" style:font-weight-complex="bold"
                             style:letter-kerning="false"/>
    </style:style>

    <!-- 섹션 제목 아래 여백용 빈 단락 -->
    <style:style style:name="Section_Spacer" style:family="paragraph">
      <style:paragraph-properties fo:margin-bottom="0.2cm"/>
    </style:style>

    <!-- 일반 본문(나머지용): 13pt, 좌측 0.5cm 들여쓰기 -->
    <style:style style:name="Official_Content" style:family="paragraph">
      <style:paragraph-properties fo:margin-bottom="0.3cm" fo:margin-left="0.5cm"/>
      <style:text-properties style:font-name="휴먼명조" style:font-name-asian="휴먼명조"
                           fo:font-size="13pt" fo:color="#000000"/>
    </style:style>

    <!-- 소제목 (○ 기호 항목): 굵게, 13pt -->
    <style:style style:name="Official_Subsection" style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.2cm" fo:margin-left="0.3cm"/>
      <style:text-properties style:font-name="휴먼명조" style:font-name-asian="휴먼명조"
                           fo:font-size="15pt" fo:letter-spacing="-0.1cm" fo:color="#000000"/>
    </style:style>

    <!-- 들여쓰기 본문 (- 기호 항목): 14pt, 좌측 0.8cm -->
    <style:style style:name="Official_Subsection_Content" style:family="paragraph">
      <style:paragraph-properties fo:margin-bottom="0.2cm" fo:margin-left="0.8cm"/>
      <style:text-properties style:font-name="휴먼명조" style:font-name-asian="휴먼명조"
                           fo:font-size="14pt" fo:color="#1b1b1b"/>
    </style:style>

    <!-- 테이블 제목: 중앙 정렬, 굵게, 14pt -->
    <style:style style:name="Table_Title" style:family="paragraph">
      <style:paragraph-properties fo:text-align="center" fo:margin-top="0.5cm" fo:margin-bottom="0.1cm"/>
      <style:text-properties style:font-name="휴먼명조" style:font-name-asian="휴먼명조"
                           fo:font-size="14pt" fo:font-weight="bold" fo:color="#000000"/>
    </style:style>

    <!-- 테이블 헤더 텍스트: 중앙 정렬, 굵게, 14pt -->
    <style:style style:name="Official_Table_Header" style:family="paragraph">
      <style:paragraph-properties fo:text-align="center"/>
      <style:text-properties style:font-name="휴먼명조" style:font-name-asian="휴먼명조"
                           fo:font-size="14pt" fo:font-weight="bold" fo:color="#000000"/>
    </style:style>

    <!-- 테이블 데이터 텍스트: 중앙 정렬, 12pt -->
    <style:style style:name="Official_Table_Cell" style:family="paragraph">
      <style:paragraph-properties fo:text-align="center"/>
      <style:text-properties style:font-name="휴먼명조" style:font-name-asian="휴먼명조"
                           fo:font-size="12pt" fo:color="#000000"/>
    </style:style>

    <!-- 메타데이터 텍스트: 중앙 정렬, 10pt, 어두운 회색 -->
    <style:style style:name="Metadata" style:family="paragraph">
      <style:paragraph-properties fo:text-align="center" fo:margin-bottom="0.1cm"/>
      <style:text-properties style:font-name="휴먼명조" style:font-name-asian="휴먼명조"
                           fo:font-size="10pt" fo:color="#3b3b3b"/>
    </style:style>

    <!-- 메타데이터 위 얇은 구분선 -->
    <style:style style:name="Metadata_Separator" style:family="paragraph">
      <style:paragraph-properties fo:border-top="0.5pt solid #cccccc" fo:margin-top="0.1cm"/>
    </style:style>
  </office:styles>

  <office:automatic-styles>
    <!-- 페이지 레이아웃: A4 (21×29.7cm), 여백 1.5cm, 세로 방향 -->
    <style:page-layout style:name="pm1">
      <style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm"
                                     fo:margin-top="1.5cm" fo:margin-bottom="1.5cm"
                                     fo:margin-left="1.5cm" fo:margin-right="1.5cm"
                                     style:print-orientation="portrait"/>
    </style:page-layout>
    <style:style style:name="P1" style:family="paragraph" style:parent-style-name="Official_Title"/>
    <style:style style:name="P2" style:family="paragraph" style:parent-style-name="Official_Content"/>
    <style:style style:name="P3" style:family="paragraph" style:parent-style-name="Official_Section_Title"/>
  </office:automatic-styles>

  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="pm1">
      <style:header-style/>
      <style:footer-style/>
    </style:master-page>
  </office:master-styles>
</office:document-styles>`;
  }

  /**
   * ODT 문서의 메타정보 파일(meta.xml)을 반환합니다.
   * 생성 도구명과 현재 시각을 포함합니다.
   */
  private getMetaXML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                     xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0">
  <office:meta>
    <meta:generator>ARES AI Report Generator</meta:generator>
    <meta:creation-date>${new Date().toISOString()}</meta:creation-date>
    <meta:editing-duration>PT0S</meta:editing-duration>
    <meta:editing-cycles>1</meta:editing-cycles>
  </office:meta>
</office:document-meta>`;
  }
}
