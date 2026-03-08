import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CONTENT_TYPE: Record<string, string> = {
  mp3:  'audio/mpeg',
  wav:  'audio/wav',
  opus: 'audio/ogg; codecs=opus',
  aac:  'audio/aac',
};

export async function POST(request: NextRequest) {
  try {
    const {
      text,
      model = 'gpt-4o-mini-tts',
      voice = 'nova',
      speed = 1.0,
      format = 'mp3',
      instructions = '',
    } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: '텍스트가 없습니다.' }, { status: 400 });
    }

    const params: Parameters<typeof openai.audio.speech.create>[0] = {
      model,
      voice,
      input: text.trim(),
      speed: Math.min(Math.max(speed, 0.25), 4.0),
      response_format: format as 'mp3' | 'wav' | 'opus' | 'aac',
    };

    // instructions는 gpt-4o-mini-tts에서만 지원
    if (model === 'gpt-4o-mini-tts' && instructions?.trim()) {
      (params as Record<string, unknown>).instructions = instructions.trim();
    }

    const audio = await openai.audio.speech.create(params);

    const buffer = Buffer.from(await audio.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': CONTENT_TYPE[format] ?? 'audio/mpeg',
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error('[TTS] 오류:', err);
    return NextResponse.json({ error: 'TTS 생성에 실패했습니다.' }, { status: 500 });
  }
}
