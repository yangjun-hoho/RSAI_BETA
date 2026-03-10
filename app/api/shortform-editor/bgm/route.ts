import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const bgmDir = path.join(process.cwd(), 'public', 'bgm');

  if (!fs.existsSync(bgmDir)) {
    return NextResponse.json([]);
  }

  const files = fs.readdirSync(bgmDir).filter(f => /\.(mp3|wav|ogg|m4a)$/i.test(f));

  const list = files.map(filename => {
    const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
    // 파일명에서 레이블 생성: 언더스코어/하이픈 → 공백, 첫 글자 대문자
    const label = nameWithoutExt
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    return { id: filename, label, file: `/bgm/${filename}` };
  });

  return NextResponse.json(list);
}
