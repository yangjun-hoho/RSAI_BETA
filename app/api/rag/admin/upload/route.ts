import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { ragDb } from '@/lib/rag/db';
import { invalidateCache } from '@/lib/rag/vectorCache';
import OpenAI from 'openai';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';

// 대용량 파일 처리를 위한 타임아웃 설정 (초)
export const maxDuration = 300;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 업로드 파일 저장 디렉토리
function getUploadDir(categoryId: string) {
  const dir = path.join(process.cwd(), 'data', 'uploads', 'rag', categoryId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// 텍스트 추출
async function extractText(buffer: Buffer, fileName: string): Promise<string> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.txt')) {
    return buffer.toString('utf-8');
  }
  if (lower.endsWith('.pdf')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const result = await pdfParse(buffer);
    return result.text as string;
  }
  if (lower.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  throw new Error('지원하지 않는 파일 형식입니다. (PDF, DOCX, TXT만 가능)');
}

// 텍스트 청킹 (500자 / 100자 오버랩)
function chunkText(text: string, chunkSize = 500, overlap = 100): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= chunkSize) return cleaned.length > 50 ? [cleaned] : [];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length >= 50) chunks.push(chunk);
    if (end >= cleaned.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

// OpenAI 임베딩 (배치, 최대 100개씩)
async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  const BATCH = 100;
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    });
    results.push(...res.data.map(d => d.embedding));
  }
  return results;
}

// 백그라운드 임베딩 처리
async function processDocument(docId: string, categoryId: string, buffer: Buffer, fileName: string) {
  try {
    ragDb.updateDocumentStatus(docId, 'processing');

    const text = await extractText(buffer, fileName);
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      ragDb.updateDocumentStatus(docId, 'error', 0, '텍스트를 추출할 수 없습니다.');
      return;
    }

    const embeddings = await embedBatch(chunks);

    const dbChunks = chunks.map((chunk, i) => ({
      id:          crypto.randomUUID(),
      document_id: docId,
      category_id: categoryId,
      chunk_text:  chunk,
      embedding:   JSON.stringify(embeddings[i]),
      chunk_index: i,
    }));

    ragDb.insertChunks(dbChunks);
    ragDb.updateDocumentStatus(docId, 'done', dbChunks.length);
    invalidateCache(categoryId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    ragDb.updateDocumentStatus(docId, 'error', 0, msg);
    console.error('[rag/upload] 임베딩 실패:', err);
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  try {
    const formData  = await request.formData();
    const file       = formData.get('file') as File | null;
    const categoryId = formData.get('categoryId') as string | null;

    if (!file)       return NextResponse.json({ error: '파일을 선택해주세요.' }, { status: 400 });
    if (!categoryId) return NextResponse.json({ error: 'categoryId 필요' }, { status: 400 });

    // 관리자가 아닌 경우 해당 카테고리의 소유자인지 확인 + 제한 검사
    if (session.role !== 'admin') {
      const cat = ragDb.getCategoryById(categoryId);
      if (!cat || cat.created_by !== session.userId || cat.is_public !== 0) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
      }

      // 파일 크기 제한
      const maxFileMb = parseFloat(ragDb.getSetting('user_chatbot_max_file_mb') ?? '10');
      if (file.size > maxFileMb * 1024 * 1024) {
        return NextResponse.json({ error: `파일 크기가 제한을 초과합니다. (최대 ${maxFileMb}MB)` }, { status: 400 });
      }

      // 문서 수 제한
      const maxDocs = parseInt(ragDb.getSetting('user_chatbot_max_docs') ?? '5', 10);
      const docs = ragDb.getDocuments(categoryId);
      const activeDocs = docs.filter(d => d.status !== 'error');
      if (activeDocs.length >= maxDocs) {
        return NextResponse.json({ error: `문서를 더 추가할 수 없습니다. (최대 ${maxDocs}개)` }, { status: 400 });
      }
    }

    const allowedExt = ['.pdf', '.docx', '.txt'];
    const ext = path.extname(file.name).toLowerCase();
    if (!allowedExt.includes(ext)) {
      return NextResponse.json({ error: 'PDF, DOCX, TXT 파일만 업로드 가능합니다.' }, { status: 400 });
    }

    // 파일 저장
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    // Magic Bytes 검사 — 파일 실제 내용이 확장자와 일치하는지 확인
    const isPdf  = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46; // %PDF
    const isDocx = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04; // PK (ZIP)
    const isTxt  = (() => {
      // BOM 없는 UTF-8 또는 BOM 있는 UTF-8 허용, 제어문자(NULL 등) 없으면 텍스트로 판정
      const sample = buffer.slice(0, 512);
      return !sample.includes(0x00);
    })();

    const magicOk =
      (ext === '.pdf'  && isPdf)  ||
      (ext === '.docx' && isDocx) ||
      (ext === '.txt'  && isTxt);

    if (!magicOk) {
      return NextResponse.json({ error: '파일 내용이 확장자와 일치하지 않습니다.' }, { status: 400 });
    }
    const docId       = crypto.randomUUID();
    const savedName   = `${docId}${ext}`;
    const filePath    = path.join(getUploadDir(categoryId), savedName);
    fs.writeFileSync(filePath, buffer);

    // DB 레코드 생성
    ragDb.createDocument({
      id:            docId,
      category_id:   categoryId,
      original_name: file.name,
      file_path:     filePath,
      file_size:     buffer.length,
      status:        'pending',
    });

    // 백그라운드 비동기 처리 (응답은 즉시 반환)
    processDocument(docId, categoryId, buffer, file.name).catch(console.error);

    return NextResponse.json({ documentId: docId, status: 'processing' });
  } catch (error) {
    console.error('[rag/upload]', error);
    return NextResponse.json({ error: '업로드 실패' }, { status: 500 });
  }
}
