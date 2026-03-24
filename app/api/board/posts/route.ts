import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';
import { getPosts, createPost, createComment, markAiCommented, hasAiComment } from '@/lib/app-db/board';
import { rejectIfPii } from '@/lib/security/piiFilter';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateAiComment(postId: number, title: string, content: string) {
  try {
    if (hasAiComment(postId)) return; // 이미 댓글 달린 경우 중복 방지

    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 친근하고 유익한 AI 커뮤니티 멤버입니다. 게시글을 읽고 다음 기준으로 자연스러운 한국어 댓글을 3~4문장으로 작성하세요.
- 게시글이 질문이거나 정보·도움을 구하는 내용이면: 핵심을 파악하여 성실하고 구체적으로 답변하세요. 단순 공감에 그치지 말고 실질적인 정보나 의견을 제공하세요.
- 게시글이 일상 이야기, 감정 공유, 경험 나눔이면: 진심 어린 공감과 따뜻한 격려로 반응하세요.
광고성 표현, 과도한 칭찬, 형식적인 인사말은 피하고 대화하듯 자연스럽게 작성하세요.`,
        },
        {
          role: 'user',
          content: `제목: ${title}\n\n내용: ${content}`,
        },
      ],
      max_completion_tokens: 350,
      temperature: 0.8,
    });

    const aiText = response.choices[0]?.message?.content?.trim();
    if (!aiText) return;

    createComment(postId, 'AI 어시스턴트', aiText, true);
    markAiCommented(postId);
  } catch (err) {
    console.error('[AI 댓글 생성 실패]', err);
  }
}

export async function GET(req: NextRequest) {
  const page = Number(req.nextUrl.searchParams.get('page') || 1);
  const data = getPosts(page);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });

  const { title, content } = await req.json() as { title: string; content: string };
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: '제목과 내용을 입력해주세요' }, { status: 400 });
  }

  const piiBlock = rejectIfPii([title, content], '/api/board/posts');
  if (piiBlock) return piiBlock;

  const post = createPost(session.userId, title.trim(), content.trim());

  // AI 댓글 비동기 생성 (응답을 블로킹하지 않음)
  void generateAiComment(post.id, post.title, post.content);

  return NextResponse.json(post, { status: 201 });
}
