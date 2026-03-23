import { NextRequest, NextResponse } from 'next/server';
import { rejectIfPii } from '@/lib/security/piiFilter';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

interface Slide {
  slideNumber: number;
  type: 'title' | 'index' | 'content' | 'conclusion';
  title: string;
  subtitle?: string;
  content: string;
  bulletPoints: string[];
  notes?: string;
}

const SYSTEM_PROMPT = `당신은 Fortune 500 기업 임원 수준의 프레젠테이션을 제작하는 전문가입니다.

슬라이드 작성 원칙:
- 각 슬라이드는 하나의 핵심 메시지만 전달
- 불릿 포인트는 구체적 수치/사례 포함 (가능한 경우)
- 제목은 20자 이내의 임팩트 있는 문구
- content는 슬라이드 핵심 설명 (1-2문장)
- bulletPoints는 3-5개, 각 항목은 간결하게

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력:
{
  "slides": [
    {
      "slideNumber": 1,
      "type": "title",
      "title": "슬라이드 제목",
      "subtitle": "부제목 (선택)",
      "content": "핵심 설명",
      "bulletPoints": ["포인트1", "포인트2"],
      "notes": "발표자 노트"
    }
  ]
}`;

function buildUserPrompt(
  inputText: string,
  pptTitle: string,
  slideCount: number,
  titleSlide: boolean,
  indexSlide: boolean,
  conclusionSlide: boolean,
): string {
  const contentCount =
    slideCount - (titleSlide ? 1 : 0) - (indexSlide ? 1 : 0) - (conclusionSlide ? 1 : 0);

  return `다음 내용을 바탕으로 "${pptTitle}" 프레젠테이션 슬라이드 ${slideCount}개를 생성하세요.

[원본 내용]
${inputText.slice(0, 6000)}

[슬라이드 구성]
${titleSlide ? `- 슬라이드 1: type="title" - 제목 슬라이드 (제목: "${pptTitle}", 인상적인 subtitle)` : ''}
${indexSlide ? `- 슬라이드 ${titleSlide ? 2 : 1}: type="index" - 목차 (bulletPoints에 각 섹션 제목 나열)` : ''}
- 본문: type="content" 슬라이드 ${contentCount}개 (각각 독립적인 주제)
${conclusionSlide ? `- 마지막 슬라이드: type="conclusion" - 결론/요약 (핵심 메시지와 다음 단계)` : ''}

총 슬라이드 수: 정확히 ${slideCount}개

JSON 형식으로만 응답하세요.`;
}

function extractJSON(raw: string): string {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

function createFallbackSlides(pptTitle: string, slideCount: number): Slide[] {
  const slides: Slide[] = [];
  slides.push({ slideNumber: 1, type: 'title', title: pptTitle, subtitle: '프레젠테이션', content: '', bulletPoints: [] });
  for (let i = 2; i < slideCount; i++) {
    slides.push({ slideNumber: i, type: 'content', title: `슬라이드 ${i}`, content: '내용을 입력하세요.', bulletPoints: ['항목 1', '항목 2', '항목 3'] });
  }
  if (slideCount > 1) {
    slides.push({ slideNumber: slideCount, type: 'conclusion', title: '결론', content: '핵심 내용을 정리합니다.', bulletPoints: ['요약 1', '요약 2', '다음 단계'] });
  }
  return slides;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      content,
      text,
      title: pptTitle = '프레젠테이션',
      slideCount = 10,
      includeTitle,
      includeIndex,
      includeConclusion,
    } = body;

    const inputText = content ?? text ?? '';
    const titleSlide: boolean = includeTitle ?? true;
    const indexSlide: boolean = includeIndex ?? true;
    const conclusionSlide: boolean = includeConclusion ?? true;

    if (!inputText.trim()) {
      return NextResponse.json({ error: '변환할 텍스트를 입력해주세요.' }, { status: 400 });
    }

    const piiBlock = rejectIfPii([inputText], '/api/work-support/ppt-converter/generate');
    if (piiBlock) return piiBlock;

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    const userPrompt = buildUserPrompt(inputText, pptTitle, slideCount, titleSlide, indexSlide, conclusionSlide);

    const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[Gemini API error]', geminiRes.status, errText);
      return NextResponse.json({ error: `AI 생성 중 오류가 발생했습니다. (${geminiRes.status})` }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    let slides: Slide[] = [];
    try {
      const jsonStr = extractJSON(raw);
      const parsed = JSON.parse(jsonStr);
      slides = parsed.slides ?? [];
    } catch (e) {
      console.error('[JSON parse error]', e, raw.slice(0, 200));
      slides = createFallbackSlides(pptTitle, slideCount);
    }

    if (!slides.length) {
      slides = createFallbackSlides(pptTitle, slideCount);
    }

    slides = slides.map((s, i) => ({
      ...s,
      slideNumber: i + 1,
      bulletPoints: s.bulletPoints ?? [],
      content: s.content ?? '',
    }));

    return NextResponse.json({ slides });
  } catch (error) {
    console.error('[ppt-converter generate API error]', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
