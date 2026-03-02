import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const dir = path.join(process.cwd(), 'public', 'images', 'rag-images');
  try {
    const files = fs.readdirSync(dir)
      .filter(f => /\.(svg|png|jpg|jpeg|webp)$/i.test(f))
      .sort();
    return NextResponse.json({ icons: files.map(f => `/images/rag-images/${f}`) });
  } catch {
    return NextResponse.json({ icons: [] });
  }
}
