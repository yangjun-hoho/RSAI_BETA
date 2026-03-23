import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const OPTION1_PROMPTS: Record<string, string> = {
  '공문체':     '텍스트를 공식 공문서 형식의 공문체로 변환하세요. 격식체를 사용하고, 반드시 문장은 명사형 또는 동사 원형으로 간결하게 끝내세요.',
  '구어체':     '텍스트를 자연스러운 구어체로 변환하세요. 딱딱한 표현 대신 실제 대화하듯 자연스럽고 친근한 문체로 바꾸세요.',
  '맞춤법 교정': '텍스트의 맞춤법, 띄어쓰기, 문법을 교정하세요. 내용은 그대로 유지하되 오류만 수정하세요.',
  '쉬운 표현':  '텍스트의 어려운 한자어나 전문용어를 일반인이 쉽게 이해할 수 있는 표현으로 바꾸세요.',
};

const OPTION2_PROMPTS: Record<string, string> = {
  '10%': '텍스트의 길이를 약 10% 줄이세요. 핵심 내용은 유지하면서 중복되거나 불필요한 부분만 최소한으로 줄이세요.',
  '20%': '텍스트의 길이를 약 20% 줄이세요. 핵심 내용은 유지하면서 덜 중요한 부분을 제거하세요.',
  '30%': '텍스트의 길이를 약 30% 줄이세요. 핵심 내용만 남기고 부가적인 설명을 줄이세요.',
  '50%': '텍스트의 길이를 절반(50%) 정도로 줄이세요. 가장 핵심적인 내용만 남기고 나머지는 과감히 제거하세요.',
};

const OPTION3_PROMPTS: Record<string, string> = {
  '2개': '내용을 핵심 2개 항목의 개조식으로 정리하세요. 각 항목은 "• "로 시작하고 간결하게 작성하세요.',
  '3개': '내용을 핵심 3개 항목의 개조식으로 정리하세요. 각 항목은 "• "로 시작하고 간결하게 작성하세요.',
  '4개': '내용을 핵심 4개 항목의 개조식으로 정리하세요. 각 항목은 "• "로 시작하고 간결하게 작성하세요.',
};

const EXPAND_PROMPTS: Record<string, string> = {
  '10%': '다음 텍스트를 원본 의미를 유지하면서 약 10% 더 길게 확장하세요. 추가하되 원래 내용의 핵심은 변경하지 마세요.',
  '20%': '다음 텍스트를 원본 의미를 유지하면서 약 20% 더 길게 확장하세요. 추가하되 원래 내용의 핵심은 변경하지 마세요.',
  '30%': '다음 텍스트를 원본 의미를 유지하면서 약 30% 더 길게 확장하세요. 추가하되 원래 내용의 핵심은 변경하지 마세요.',
  '50%': '다음 텍스트를 원본 의미를 유지하면서 약 50% 더 길게 확장하세요. 추가하되 원래 내용의 핵심은 변경하지 마세요.',
};

function parseJsonArray(raw: string): string[] {
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    const arr = JSON.parse(match ? match[0] : raw);
    return Array.isArray(arr) ? arr.filter(v => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, option1, option2, option3, mode, expandPercent, keywordCount, keyword } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: '텍스트를 입력해주세요.' }, { status: 400 });
    }

    // ── 텍스트 늘리기 ──
    if (mode === 'expand') {
      const prompt = EXPAND_PROMPTS[expandPercent];
      if (!prompt) return NextResponse.json({ error: '유효하지 않은 비율입니다.' }, { status: 400 });

      const completion = await openai.chat.completions.create({
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: `당신은 한국 공무원을 위한 텍스트 확장 도우미입니다. ${prompt}\n\n확장된 텍스트만 출력하고 설명이나 부연설명은 절대 하지 마세요.` },
          { role: 'user', content: text.trim() },
        ],
        max_completion_tokens: 2000,
      });
      return NextResponse.json({ result: completion.choices[0]?.message?.content ?? '' });
    }

    // ── 키워드 추출 ──
    if (mode === 'keywords') {
      const count = typeof keywordCount === 'number' ? keywordCount : 5;

      const completion = await openai.chat.completions.create({
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: `다음 텍스트에서 핵심 키워드를 ${count}개 추출하세요. JSON 배열 형태로만 응답하세요: ["키워드1", "키워드2", ...]` },
          { role: 'user', content: text.trim() },
        ],
        max_completion_tokens: 200,
      });
      const keywords = parseJsonArray(completion.choices[0]?.message?.content ?? '[]');
      return NextResponse.json({ keywords });
    }

    // ── 유사어 제안 ──
    if (mode === 'synonyms') {
      if (!keyword) return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });

      const completion = await openai.chat.completions.create({
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: `'${keyword}'의 유사어 또는 대체 가능한 표현을 5개 제안하세요. 주어진 텍스트 맥락에서 자연스럽게 사용할 수 있는 단어/표현으로 JSON 배열 형태로만 응답하세요: ["대체어1", "대체어2", ...]` },
          { role: 'user', content: text.trim() },
        ],
        max_completion_tokens: 200,
      });
      const synonyms = parseJsonArray(completion.choices[0]?.message?.content ?? '[]');
      return NextResponse.json({ synonyms });
    }

    // ── 기존 변환 (option1 / option2 / option3) ──
    if (!option1 && !option2 && !option3) {
      return NextResponse.json({ error: '변환 옵션을 하나 이상 선택해주세요.' }, { status: 400 });
    }

    const steps: string[] = [];
    if (option1) {
      const p = OPTION1_PROMPTS[option1];
      if (!p) return NextResponse.json({ error: '유효하지 않은 옵션입니다.' }, { status: 400 });
      steps.push(p);
    }
    if (option2) {
      const p = OPTION2_PROMPTS[option2];
      if (!p) return NextResponse.json({ error: '유효하지 않은 옵션입니다.' }, { status: 400 });
      steps.push(p);
    }
    if (option3) {
      const p = OPTION3_PROMPTS[option3];
      if (!p) return NextResponse.json({ error: '유효하지 않은 옵션입니다.' }, { status: 400 });
      steps.push(p);
    }

    const instructions = steps.length === 1
      ? steps[0]
      : `다음 순서로 변환을 적용하세요:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: `당신은 한국 공무원을 위한 텍스트 변환 도우미입니다. ${instructions}\n\n변환된 텍스트만 출력하고 설명이나 부연설명은 절대 하지 마세요.` },
        { role: 'user', content: text.trim() },
      ],
      max_completion_tokens: 1500,
    });

    return NextResponse.json({ result: completion.choices[0]?.message?.content ?? '' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '변환 중 오류가 발생했습니다.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
