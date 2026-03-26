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

    // Google Gemini TTS
    if (model === 'gemini-2.5-flash-preview-tts') {
      const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'Google API 키가 설정되지 않았습니다.' }, { status: 500 });
      }

      const inputText = instructions?.trim()
        ? `${instructions.trim()}\n\n${text.trim()}`
        : text.trim();

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: inputText }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice },
                },
              },
            },
          }),
        }
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error('[TTS/Gemini] 오류:', errText);
        return NextResponse.json({ error: 'Gemini TTS 생성에 실패했습니다.' }, { status: 500 });
      }

      const geminiJson = await geminiRes.json();
      const b64 = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) {
        return NextResponse.json({ error: 'Gemini TTS 응답에 오디오 데이터가 없습니다.' }, { status: 500 });
      }

      // Gemini는 LINEAR16 PCM 반환 → WAV 헤더 추가
      const pcmBuffer = Buffer.from(b64, 'base64');
      const sampleRate = 24000;
      const numChannels = 1;
      const bitsPerSample = 16;
      const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
      const blockAlign = numChannels * (bitsPerSample / 8);
      const dataSize = pcmBuffer.length;
      const header = Buffer.alloc(44);
      header.write('RIFF', 0);
      header.writeUInt32LE(36 + dataSize, 4);
      header.write('WAVE', 8);
      header.write('fmt ', 12);
      header.writeUInt32LE(16, 16);
      header.writeUInt16LE(1, 20);
      header.writeUInt16LE(numChannels, 22);
      header.writeUInt32LE(sampleRate, 24);
      header.writeUInt32LE(byteRate, 28);
      header.writeUInt16LE(blockAlign, 32);
      header.writeUInt16LE(bitsPerSample, 34);
      header.write('data', 36);
      header.writeUInt32LE(dataSize, 40);
      const wavBuffer = Buffer.concat([header, pcmBuffer]);

      return new NextResponse(wavBuffer, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': String(wavBuffer.length),
        },
      });
    }

    // OpenAI TTS (tts-1, gpt-4o-mini-tts)
    const params: Parameters<typeof openai.audio.speech.create>[0] = {
      model,
      voice,
      input: text.trim(),
      speed: Math.min(Math.max(speed, 0.25), 4.0),
      response_format: format as 'mp3' | 'wav' | 'opus' | 'aac',
    };

    if (model === 'gpt-4o-mini-tts' && instructions?.trim()) {
      (params as unknown as Record<string, unknown>).instructions = instructions.trim();
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
