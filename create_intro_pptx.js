const PptxGenJS = require('pptxgenjs');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';

const C = {
  blue:      '1B3F7A',
  green:     '2D8A4E',
  white:     'FFFFFF',
  lightGray: 'F5F6F8',
  gray:      '6B7280',
  darkText:  '1F2937',
  lineGray:  'E5E7EB',
  subText:   '4B5563',
};

function addTopBar(slide) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.1, fill: { color: C.blue } });
  slide.addShape(pptx.ShapeType.rect, { x: '87%', y: 0, w: '13%', h: 0.1, fill: { color: C.green } });
}

function addBottomBar(slide) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.4, w: '100%', h: 0.08, fill: { color: C.blue } });
  slide.addText('RSAI  |  남양주시 AI 업무지원 시스템', {
    x: 0, y: 7.28, w: '100%', h: 0.18,
    align: 'center', fontSize: 7.5, color: C.gray, fontFace: '맑은 고딕',
  });
}

function addPageHeader(slide, title, subtitle) {
  addTopBar(slide);
  slide.addShape(pptx.ShapeType.rect, { x: 0.45, y: 0.3, w: 0.07, h: 0.48, fill: { color: C.blue } });
  slide.addText(title, {
    x: 0.62, y: 0.26, w: 9, h: 0.36,
    fontSize: 20, bold: true, color: C.blue, fontFace: '맑은 고딕',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.62, y: 0.62, w: 11, h: 0.22,
      fontSize: 10, color: C.gray, fontFace: '맑은 고딕',
    });
  }
  slide.addShape(pptx.ShapeType.line, {
    x: 0.45, y: 0.96, w: 12.1, h: 0,
    line: { color: C.lineGray, width: 1 },
  });
  addBottomBar(slide);
}

// ── 슬라이드 1: 표지 ──────────────────────────────
{
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: C.blue } });
  s.addShape(pptx.ShapeType.rect, { x: 9.9, y: 0, w: 3.1, h: '100%', fill: { color: C.green } });
  s.addShape(pptx.ShapeType.rect, { x: 9.3, y: 0, w: 0.3, h: '100%', fill: { color: 'FFFFFF', transparency: 80 } });

  s.addText('RSAI', {
    x: 0.8, y: 1.5, w: 8, h: 1.1,
    fontSize: 60, bold: true, color: C.white, fontFace: '맑은 고딕',
  });
  s.addText('남양주시 AI 업무지원 시스템', {
    x: 0.8, y: 2.55, w: 8, h: 0.5,
    fontSize: 20, color: 'BFD4F5', fontFace: '맑은 고딕',
  });
  s.addShape(pptx.ShapeType.line, { x: 0.8, y: 3.18, w: 4.5, h: 0, line: { color: C.green, width: 2 } });
  s.addText('프로그램 사용 안내', {
    x: 0.8, y: 3.35, w: 8, h: 0.38,
    fontSize: 14, color: 'D1E4FF', fontFace: '맑은 고딕',
  });
  s.addText('남양주시 정보통신과', {
    x: 0.8, y: 6.9, w: 8, h: 0.3,
    fontSize: 10, color: '7BA8E0', fontFace: '맑은 고딕',
  });
}

// ── 슬라이드 2: 전체 메뉴 구성 ─────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.lightGray };
  addPageHeader(s, '전체 메뉴 구성', 'RSAI는 AI 채팅과 다양한 문서 자동 생성 도구로 구성됩니다');

  // 3열 구성
  const cols = [
    {
      header: '💬  AI 채팅',
      color: C.blue,
      items: ['자유 대화 및 업무 질의', '실시간 웹검색 연동', 'OpenAI / Google AI 모델 선택', '대화 내용 내보내기'],
    },
    {
      header: '⚡  AI 도구',
      color: '7C3AED',
      items: ['보고서 생성', '인사말씀 생성', '보도자료 생성', '공적조서 생성', '시나리오 생성', 'PPT 생성'],
    },
    {
      header: '⚡  업무 지원 2',
      color: C.green,
      items: ['보고서 생성 v2', '보도자료 생성 v2', '인사말씀 생성 v2', '공적조서 생성 v2', '확대간부회의 자료 생성'],
    },
  ];

  cols.forEach((col, ci) => {
    const x = 0.45 + ci * 4.1;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.1, w: 3.85, h: 5.9,
      fill: { color: C.white }, line: { color: C.lineGray, width: 1 }, rectRadius: 0.1,
    });
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.1, w: 3.85, h: 0.52,
      fill: { color: col.color }, rectRadius: 0.1,
    });
    // 하단 모서리 덮기 (roundRect 상단만 둥글게)
    s.addShape(pptx.ShapeType.rect, { x, y: 1.42, w: 3.85, h: 0.2, fill: { color: col.color } });

    s.addText(col.header, {
      x: x + 0.15, y: 1.13, w: 3.55, h: 0.46,
      fontSize: 12, bold: true, color: C.white, fontFace: '맑은 고딕', valign: 'middle',
    });
    col.items.forEach((item, ii) => {
      const y = 1.75 + ii * 0.72;
      s.addShape(pptx.ShapeType.ellipse, {
        x: x + 0.22, y: y + 0.13, w: 0.14, h: 0.14,
        fill: { color: col.color },
      });
      s.addText(item, {
        x: x + 0.45, y, w: 3.2, h: 0.4,
        fontSize: 11, color: C.darkText, fontFace: '맑은 고딕', valign: 'middle',
      });
    });
  });

  // 하단 기타 메뉴
  const extras = ['업무 템플릿', 'RAG 검색', '텍스트 변환', 'AI 자유게시판', '외부 도구 모음'];
  s.addText('그 외 기능', {
    x: 0.45, y: 7.05, w: 2, h: 0.22,
    fontSize: 9, bold: true, color: C.gray, fontFace: '맑은 고딕',
  });
  extras.forEach((e, i) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 2.35 + i * 2.1, y: 7.03, w: 1.9, h: 0.22,
      fill: { color: 'EEF2FF' }, line: { color: 'C7D2FE', width: 1 }, rectRadius: 0.05,
    });
    s.addText(e, {
      x: 2.35 + i * 2.1, y: 7.03, w: 1.9, h: 0.22,
      align: 'center', fontSize: 8.5, color: '4338CA', fontFace: '맑은 고딕',
    });
  });
}

// ── 슬라이드 3: AI 채팅 ───────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.lightGray };
  addPageHeader(s, 'AI 채팅', '업무 관련 질문을 자유롭게 입력하면 AI가 답변합니다');

  const features = [
    { icon: '🌐', title: '실시간 웹검색', desc: '최신 정보가 필요한 질문에 자동으로 웹검색 결과를 반영하여 답변합니다. 검색 ON/OFF 전환 가능.' },
    { icon: '🤖', title: 'AI 모델 선택', desc: 'OpenAI(ChatGPT), Google AI(Gemini) 두 가지 모델을 상황에 따라 전환하여 사용할 수 있습니다.' },
    { icon: '📋', title: '대화 내보내기', desc: '채팅 내용을 텍스트 파일로 내보낼 수 있습니다. 업무 참고자료로 저장하여 활용하세요.' },
    { icon: '🗂️', title: '업무 템플릿', desc: '공무원 업무에 특화된 AI 프롬프트 템플릿을 제공합니다. 자주 쓰는 형식을 빠르게 불러옵니다.' },
  ];

  features.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.45 + col * 6.2;
    const y = 1.15 + row * 2.75;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 5.9, h: 2.45,
      fill: { color: C.white }, line: { color: C.lineGray, width: 1 }, rectRadius: 0.1,
    });
    s.addText(f.icon, { x: x + 0.25, y: y + 0.2, w: 0.5, h: 0.5, fontSize: 22 });
    s.addText(f.title, {
      x: x + 0.82, y: y + 0.22, w: 4.8, h: 0.42,
      fontSize: 14, bold: true, color: C.blue, fontFace: '맑은 고딕',
    });
    s.addShape(pptx.ShapeType.line, {
      x: x + 0.25, y: y + 0.75, w: 5.4, h: 0,
      line: { color: C.lineGray, width: 0.75 },
    });
    s.addText(f.desc, {
      x: x + 0.25, y: y + 0.88, w: 5.4, h: 1.35,
      fontSize: 11, color: C.subText, fontFace: '맑은 고딕', lineSpacingMultiple: 1.5,
    });
  });
}

// ── 슬라이드 4: AI 도구 (6개) ────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.lightGray };
  addPageHeader(s, 'AI 도구', '자주 쓰는 공문서를 AI가 자동으로 초안 작성합니다 — HWP 파일 다운로드');

  const tools = [
    { title: '보고서 생성',   input: '부서명, 제목, 핵심 내용',         output: '구조화된 업무보고서 HWP' },
    { title: '인사말씀 생성', input: '행사명, 행사 내용, 참석 대상',    output: '격식체 인사말씀 원고 HWP' },
    { title: '보도자료 생성', input: '제목, 핵심 내용, 일시·장소',       output: '공식 보도자료 형식 HWP' },
    { title: '공적조서 생성', input: '수상자 정보, 분야, 핵심 공적',    output: '공무원·일반인 공적조서 HWP' },
    { title: '시나리오 생성', input: '발표 자료 내용 붙여넣기',          output: '발표용 구어체 시나리오 HWP' },
    { title: 'PPT 생성',      input: '제목, 주요 내용, 슬라이드 수',    output: 'AI 구성 프레젠테이션 PPTX' },
  ];

  // 헤더 행
  s.addShape(pptx.ShapeType.rect, { x: 0.45, y: 1.08, w: 12.1, h: 0.38, fill: { color: C.blue } });
  [{ t: '기능', w: 2.3, x: 0.45 }, { t: '입력 항목', w: 5.2, x: 2.75 }, { t: '출력 결과', w: 4.6, x: 7.95 }].forEach(h => {
    s.addText(h.t, {
      x: h.x + 0.15, y: 1.08, w: h.w, h: 0.38,
      fontSize: 10.5, bold: true, color: C.white, fontFace: '맑은 고딕', valign: 'middle',
    });
  });

  tools.forEach((t, i) => {
    const y = 1.46 + i * 0.88;
    const bg = i % 2 === 0 ? C.white : 'F9FAFB';
    s.addShape(pptx.ShapeType.rect, { x: 0.45, y, w: 12.1, h: 0.88, fill: { color: bg } });
    // 구분선
    s.addShape(pptx.ShapeType.line, { x: 0.45, y: y + 0.88, w: 12.1, h: 0, line: { color: C.lineGray, width: 0.5 } });
    s.addShape(pptx.ShapeType.line, { x: 2.75, y, w: 0, h: 0.88, line: { color: C.lineGray, width: 0.5 } });
    s.addShape(pptx.ShapeType.line, { x: 7.95, y, w: 0, h: 0.88, line: { color: C.lineGray, width: 0.5 } });

    // 기능명 배지
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.6, y: y + 0.22, w: 2.0, h: 0.44,
      fill: { color: 'EEF3FB' }, rectRadius: 0.06,
    });
    s.addText(t.title, {
      x: 0.6, y: y + 0.22, w: 2.0, h: 0.44,
      align: 'center', fontSize: 10.5, bold: true, color: C.blue, fontFace: '맑은 고딕', valign: 'middle',
    });
    s.addText(t.input, {
      x: 2.9, y: y + 0.2, w: 4.9, h: 0.48,
      fontSize: 10.5, color: C.subText, fontFace: '맑은 고딕', valign: 'middle',
    });
    s.addText(t.output, {
      x: 8.1, y: y + 0.2, w: 4.3, h: 0.48,
      fontSize: 10.5, color: C.darkText, fontFace: '맑은 고딕', valign: 'middle', bold: true,
    });
  });
}

// ── 슬라이드 5: 업무 지원 2 ──────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.lightGray };
  addPageHeader(s, '업무 지원 2', '남양주시 공식 서식이 적용된 HWP 파일을 AI가 자동 생성합니다');

  const tools = [
    { title: '보고서 생성 v2',         desc: '구조화된 업무보고서. 제목·부제목·섹션·항목 자동 구성',              badge: '개선' },
    { title: '보도자료 생성 v2',        desc: '공식 보도자료 형식. 남양주시 양식 그대로 적용',                     badge: '개선' },
    { title: '인사말씀 생성 v2',        desc: '행사별 맞춤 인사말씀. 분량·문체 자동 조정',                        badge: '개선' },
    { title: '공적조서 생성 v2',        desc: '공무원·일반인 구분 작성. 핵심 성과 자동 변환',                      badge: '개선' },
    { title: '확대간부회의 자료 생성',  desc: '기본형·교육형·사업형·행사1형·행사2형 5가지 템플릿 지원. A4 가로 1장', badge: '신규' },
  ];

  const badgeColors = { '신규': [C.green, 'D1FAE5', '065F46'], '개선': [C.blue, 'DBEAFE', '1E40AF'] };

  tools.forEach((t, i) => {
    const y = 1.1 + i * 1.18;
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.45, y, w: 12.1, h: 1.0,
      fill: { color: C.white }, line: { color: C.lineGray, width: 1 }, rectRadius: 0.09,
    });
    const [, bgC, txtC] = badgeColors[t.badge];
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.62, y: y + 0.32, w: 0.88, h: 0.3,
      fill: { color: bgC }, rectRadius: 0.08,
    });
    s.addText(t.badge, {
      x: 0.62, y: y + 0.32, w: 0.88, h: 0.3,
      align: 'center', fontSize: 8.5, bold: true, color: txtC, fontFace: '맑은 고딕',
    });
    s.addText(t.title, {
      x: 1.65, y: y + 0.12, w: 4.5, h: 0.38,
      fontSize: 13, bold: true, color: C.darkText, fontFace: '맑은 고딕',
    });
    s.addText(t.desc, {
      x: 1.65, y: y + 0.52, w: 10.7, h: 0.36,
      fontSize: 10.5, color: C.subText, fontFace: '맑은 고딕',
    });
  });
}

// ── 슬라이드 6: 부가 기능 ─────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.lightGray };
  addPageHeader(s, '부가 기능', '업무 효율을 높이는 다양한 보조 도구를 제공합니다');

  const items = [
    { icon: '📚', title: 'RAG (NotebookLM)', color: '7C3AED', desc: '내부 문서를 업로드하면 AI가 해당 문서 기반으로 질의응답합니다. 조례·지침·매뉴얼 활용에 적합합니다.' },
    { icon: '🔤', title: '텍스트 변환',       color: C.green,   desc: '작성한 문장의 문체를 공식체·구어체로 변환하거나 맞춤법 교정, 표현 다듬기를 자동으로 처리합니다.' },
    { icon: '🤖', title: 'AI 자유게시판',     color: C.blue,    desc: '직원들이 AI 활용 사례, 프롬프트 팁, 질문을 자유롭게 공유하는 게시판입니다.' },
    { icon: '🌐', title: '외부 도구 모음',    color: '0369A1',  desc: '숏폼 에디터, 차트 에디터, 화면 녹화, 최신 AI 도구, 연속지적도 등 업무 보조 도구 모음입니다.' },
  ];

  items.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.45 + col * 6.2;
    const y = 1.12 + row * 2.95;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 5.9, h: 2.68,
      fill: { color: C.white }, line: { color: C.lineGray, width: 1 }, rectRadius: 0.1,
    });
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 5.9, h: 0.56,
      fill: { color: item.color }, rectRadius: 0.1,
    });
    s.addShape(pptx.ShapeType.rect, { x, y: y + 0.36, w: 5.9, h: 0.2, fill: { color: item.color } });
    s.addText(`${item.icon}  ${item.title}`, {
      x: x + 0.2, y: y + 0.1, w: 5.5, h: 0.38,
      fontSize: 13, bold: true, color: C.white, fontFace: '맑은 고딕', valign: 'middle',
    });
    s.addText(item.desc, {
      x: x + 0.2, y: y + 0.72, w: 5.5, h: 1.78,
      fontSize: 11, color: C.subText, fontFace: '맑은 고딕', lineSpacingMultiple: 1.5,
    });
  });
}

// ── 슬라이드 7: 마무리 ────────────────────────────
{
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: C.blue } });
  s.addShape(pptx.ShapeType.rect, { x: 9.9, y: 0, w: 3.1, h: '100%', fill: { color: C.green } });
  s.addShape(pptx.ShapeType.rect, { x: 9.3, y: 0, w: 0.3, h: '100%', fill: { color: 'FFFFFF', transparency: 80 } });

  s.addText('더 나은 업무 환경을\nAI와 함께', {
    x: 0.8, y: 1.9, w: 8.5, h: 1.5,
    fontSize: 32, bold: true, color: C.white, fontFace: '맑은 고딕', lineSpacingMultiple: 1.4,
  });
  s.addShape(pptx.ShapeType.line, { x: 0.8, y: 3.52, w: 4, h: 0, line: { color: C.green, width: 2 } });
  s.addText('궁금한 사항은 정보통신과로 문의해 주세요.', {
    x: 0.8, y: 3.72, w: 9, h: 0.42,
    fontSize: 13, color: 'BFD4F5', fontFace: '맑은 고딕',
  });
  s.addText('RSAI  |  남양주시 AI 업무지원 시스템', {
    x: 0.8, y: 6.88, w: 8, h: 0.28,
    fontSize: 9.5, color: '7BA8E0', fontFace: '맑은 고딕',
  });
}

pptx.writeFile({ fileName: 'public/PPTX/RSAI_프로그램소개.pptx' })
  .then(() => console.log('저장 완료: public/PPTX/RSAI_프로그램소개.pptx'))
  .catch(console.error);
