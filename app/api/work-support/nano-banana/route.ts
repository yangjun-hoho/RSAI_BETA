import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-3.1-flash-image-preview';

// ── 서버 전역 사용량 (모든 사용자 합산) ──────────────────────
const GLOBAL_DAILY_LIMIT = 30;
let globalUsage = { count: 0, date: new Date().toDateString() };

function getUsage() {
  const today = new Date().toDateString();
  if (globalUsage.date !== today) {
    globalUsage = { count: 0, date: today };
  }
  return globalUsage;
}

export async function GET() {
  const usage = getUsage();
  const remaining = Math.max(0, GLOBAL_DAILY_LIMIT - usage.count);
  return NextResponse.json({ remaining, total: GLOBAL_DAILY_LIMIT, used: usage.count });
}

function buildEditPrompt(instruction: string, hasMask: boolean): string {
  const maskInstruction = hasMask
    ? '\n\nIMPORTANT: Apply changes ONLY where the mask image shows white pixels (value 255). Leave all other areas completely unchanged. Respect the mask boundaries precisely and maintain seamless blending at the edges.'
    : '';

  return `Edit this image according to the following instruction: ${instruction}

Maintain the original image's lighting, perspective, and overall composition. Make the changes look natural and seamlessly integrated.${maskInstruction}

Preserve image quality and ensure the edit looks professional and realistic.`;
}

export async function POST(request: NextRequest) {
  try {
    // 서버 전역 한도 체크
    const usage = getUsage();
    if (usage.count >= GLOBAL_DAILY_LIMIT) {
      return NextResponse.json(
        { error: `오늘의 전체 생성 한도(${GLOBAL_DAILY_LIMIT}회)에 도달했습니다. 내일 다시 이용해주세요.` },
        { status: 429 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    const body = await request.json();
    const { tool, prompt, originalImage, referenceImages, maskImage, temperature, aspectRatio, imageSize } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: '프롬프트를 입력해주세요.' }, { status: 400 });
    }

    const genAI = new GoogleGenAI({ apiKey });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contents: any[] = [];

    if (tool === 'generate') {
      // 텍스트 프롬프트 먼저
      contents.push({ text: prompt });
      // 참조 이미지 추가 (최대 10개)
      if (referenceImages?.length > 0) {
        for (const img of referenceImages.slice(0, 10)) {
          contents.push({ inlineData: { mimeType: 'image/png', data: img } });
        }
      }
    } else {
      // edit / mask 모드
      if (!originalImage) {
        return NextResponse.json({ error: '편집할 이미지가 없습니다.' }, { status: 400 });
      }
      contents.push({ text: buildEditPrompt(prompt, !!maskImage) });
      contents.push({ inlineData: { mimeType: 'image/png', data: originalImage } });
      if (maskImage) {
        contents.push({ inlineData: { mimeType: 'image/png', data: maskImage } });
      }
      if (referenceImages?.length > 0) {
        for (const img of referenceImages.slice(0, 10)) {
          contents.push({ inlineData: { mimeType: 'image/png', data: img } });
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generationConfig: any = {
      responseModalities: ['TEXT', 'IMAGE'],
    };

    // imageConfig: aspectRatio / imageSize
    if (aspectRatio || imageSize) {
      generationConfig.imageConfig = {};
      if (aspectRatio) generationConfig.imageConfig.aspectRatio = aspectRatio;
      if (imageSize) generationConfig.imageConfig.imageSize = imageSize;
    }

    if (temperature !== undefined) {
      generationConfig.temperature = temperature;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {
      model: MODEL,
      contents,
      generationConfig,
    };

    const response = await genAI.models.generateContent(config);

    if (!response?.candidates?.length) {
      console.error('[nano-banana] No candidates in response:', response);
      return NextResponse.json({ error: '이미지를 생성하지 못했습니다.' }, { status: 500 });
    }

    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          usage.count++;
          const remaining = Math.max(0, GLOBAL_DAILY_LIMIT - usage.count);
          return NextResponse.json({
            image: part.inlineData.data,
            remaining,
          });
        }
      }
    }

    return NextResponse.json({ error: '응답에 이미지가 없습니다.' }, { status: 500 });
  } catch (error) {
    console.error('[nano-banana] error:', error);
    const msg = error instanceof Error ? error.message : '서버 오류가 발생했습니다.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
