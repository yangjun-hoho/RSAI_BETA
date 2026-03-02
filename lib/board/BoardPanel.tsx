'use client';

import { useState, useEffect, useCallback } from 'react';

interface Post { id: number; title: string; nickname: string; views: number; created_at: string; comment_count: number; }
interface PostDetail { id: number; user_id: number; title: string; content: string; nickname: string; views: number; created_at: string; }
interface Comment { id: number; author: string; content: string; is_ai: number; created_at: string; }
interface Me { id: number; nickname: string; role: string; }

type RightPanel = 'empty' | 'detail' | 'write';

export default function BoardPanel({ onBack }: { onBack?: () => void }) {
  const [me, setMe] = useState<Me | null>(null);

  // 좌측: 목록
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // 우측 패널 상태
  const [rightPanel, setRightPanel] = useState<RightPanel>('empty');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // 게시글 상세
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 글쓰기 폼
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setMe(d.user ?? null));
  }, []);

  const loadPosts = useCallback(() => {
    fetch(`/api/board/posts?page=${page}`)
      .then(r => r.json())
      .then(d => { setPosts(d.posts ?? []); setTotal(d.total ?? 0); setTotalPages(d.totalPages ?? 1); });
  }, [page]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const fetchComments = useCallback(() => {
    if (!selectedId) return;
    fetch(`/api/board/posts/${selectedId}/comments`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setComments(Array.isArray(d) ? d : []));
  }, [selectedId]);

  // 게시글 선택 시 상세 로드
  useEffect(() => {
    if (!selectedId) { setPost(null); setComments([]); return; }
    setLoadingPost(true);
    fetch(`/api/board/posts/${selectedId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setPost(d); setLoadingPost(false); });
    fetchComments();
  }, [selectedId, fetchComments]);

  // AI 댓글 폴링 (최대 15초)
  useEffect(() => {
    if (!post) return;
    if (comments.some(c => c.is_ai === 1)) return;
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      fetchComments();
      if (tries >= 5) clearInterval(iv);
    }, 3000);
    return () => clearInterval(iv);
  }, [post, comments, fetchComments]);

  function selectPost(id: number) {
    setSelectedId(id);
    setRightPanel('detail');
    setCommentText('');
  }

  function openWrite() {
    setSelectedId(null);
    setRightPanel('write');
    setNewTitle('');
    setNewContent('');
  }

  async function handleDelete() {
    if (!selectedId || !confirm('정말 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/board/posts/${selectedId}`, { method: 'DELETE' });
    if (res.ok) {
      setSelectedId(null);
      setPost(null);
      setRightPanel('empty');
      loadPosts();
    }
  }

  async function submitComment() {
    if (!commentText.trim() || submitting || !selectedId) return;
    setSubmitting(true);
    const res = await fetch(`/api/board/posts/${selectedId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentText.trim() }),
    });
    if (res.ok) {
      setCommentText('');
      fetchComments();
    }
    setSubmitting(false);
  }

  async function handlePost() {
    if (!newTitle.trim() || !newContent.trim() || posting) return;
    setPosting(true);
    const res = await fetch('/api/board/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), content: newContent.trim() }),
    });
    if (res.ok) {
      const newPost = await res.json() as PostDetail;
      setNewTitle('');
      setNewContent('');
      setPage(1);
      loadPosts();
      setSelectedId(newPost.id);
      setRightPanel('detail');
    }
    setPosting(false);
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
  }
  function formatDateTime(s: string) {
    return new Date(s).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  const canDelete = me && post && (me.id === post.user_id || me.role === 'admin');

  return (
    <div style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%', background: '#faf9f5', overflow: 'hidden' }}>

      {/* ── 좌측: 목록 패널 ── */}
      <div style={{ flex: '0 0 40%', width: '40%', borderRight: '1px solid #e9e9e7', display: 'flex', flexDirection: 'column', background: '#faf9f5', overflow: 'hidden' }}>

        {/* 목록 헤더 */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e9e9e7', background: 'white', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#37352f' }}>🤖 AI 자유게시판</span>
              <span style={{ fontSize: '0.7rem', color: '#9b9a97', background: '#f0f0ee', borderRadius: '8px', padding: '0.1rem 0.4rem' }}>{total}</span>
            </div>
            {me && (
              <button
                onClick={openWrite}
                style={{ padding: '0.28rem 0.65rem', background: rightPanel === 'write' ? '#37352f' : 'transparent', color: rightPanel === 'write' ? 'white' : '#37352f', border: '1px solid #37352f', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
              >
                + 글쓰기
              </button>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#9b9a97', lineHeight: 1.5 }}>
            글을 작성하면 <strong style={{ color: '#2383e2', fontWeight: 600 }}>AI가 자동으로 댓글</strong>을 달아드립니다 ✨
          </p>
        </div>

        {/* 게시글 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {posts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#9b9a97', fontSize: '0.82rem', background: 'white', borderRadius: '10px', border: '1px solid #e9e9e7' }}>게시글이 없습니다</div>
          ) : posts.map((p, i) => (
            <div
              key={p.id}
              onClick={() => selectPost(p.id)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: selectedId === p.id ? '2px solid #2383e2' : '1px solid #c8c6c0',
                cursor: 'pointer',
                background: selectedId === p.id ? '#eff6ff' : 'white',
                boxShadow: selectedId === p.id ? '0 1px 4px rgba(35,131,226,0.10)' : '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'all 0.1s',
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (selectedId !== p.id) { e.currentTarget.style.background = '#f5f9ff'; e.currentTarget.style.borderColor = '#bfdbfe'; } }}
              onMouseLeave={e => { if (selectedId !== p.id) { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#c8c6c0'; } }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.4rem' }}>
                <span style={{
                  fontSize: '0.96rem', color: '#37352f',
                  fontWeight: selectedId === p.id ? 600 : 500,
                  lineHeight: 1.4, flex: 1,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  <span style={{ color: '#c0c0bd', marginRight: '0.3rem', fontSize: '0.86rem' }}>{total - (page - 1) * 15 - i}</span>
                  {p.title}
                </span>
                {p.comment_count > 0 && (
                  <span style={{ fontSize: '0.78rem', color: '#2383e2', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.1rem 0.35rem', flexShrink: 0 }}>
                    💬 {p.comment_count}
                  </span>
                )}
              </div>
              <div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.4rem', fontSize: '0.82rem', color: '#b0aeab' }}>
                <span>{p.nickname}</span>
                <span>·</span>
                <span>{formatDate(p.created_at)}</span>
                <span>·</span>
                <span>조회 {p.views}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div style={{ padding: '0.6rem', background: '#faf9f5', display: 'flex', justifyContent: 'center', gap: '0.2rem', flexShrink: 0 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{
                  width: '26px', height: '26px', borderRadius: '5px', border: '1px solid', fontSize: '0.72rem', cursor: 'pointer',
                  borderColor: p === page ? '#37352f' : '#e0e0e0',
                  background: p === page ? '#37352f' : 'white',
                  color: p === page ? 'white' : '#37352f',
                }}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 우측: 상세 / 글쓰기 / 빈 상태 ── */}
      <div style={{ flex: '0 0 60%', width: '60%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 메인 채팅 버튼 (항상 표시) */}
        {onBack && (
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e9e9e7', background: 'white', flexShrink: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              onClick={onBack}
              style={{ padding: '0.28rem 0.65rem', background: 'white', border: '1px solid #e9e9e7', borderRadius: '7px', fontSize: '0.78rem', color: '#37352f', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              ← 메인 채팅으로
            </button>
          </div>
        )}

        {/* 글쓰기 폼 */}
        {rightPanel === 'write' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#37352f' }}>새 글 작성</h2>
                <button onClick={() => setRightPanel('empty')}
                  style={{ fontSize: '0.78rem', color: '#9b9a97', background: 'none', border: '1px solid #e9e9e7', borderRadius: '6px', padding: '0.28rem 0.65rem', cursor: 'pointer' }}>
                  취소
                </button>
              </div>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                style={{ padding: '0.65rem 0.9rem', border: '1px solid #e9e9e7', borderRadius: '8px', fontSize: '0.9rem', color: '#37352f', outline: 'none', fontFamily: 'inherit', background: 'white' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#37352f')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e9e9e7')}
              />
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="내용을 입력하세요&#10;&#10;글을 작성하면 AI가 자동으로 댓글을 달아드립니다 🤖"
                rows={14}
                style={{ padding: '0.65rem 0.9rem', border: '1px solid #e9e9e7', borderRadius: '8px', fontSize: '0.88rem', color: '#37352f', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7, background: 'white' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#37352f')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e9e9e7')}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => void handlePost()}
                  disabled={posting || !newTitle.trim() || !newContent.trim()}
                  style={{
                    padding: '0.55rem 1.5rem',
                    background: newTitle.trim() && newContent.trim() ? '#37352f' : '#e9e9e7',
                    color: newTitle.trim() && newContent.trim() ? 'white' : '#b0aeab',
                    border: 'none', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {posting ? '등록 중...' : '등록'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 게시글 상세 */}
        {rightPanel === 'detail' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {loadingPost ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#9b9a97', fontSize: '0.88rem' }}>
                불러오는 중...
              </div>
            ) : post ? (
              <div style={{ maxWidth: '720px', margin: '0 auto' }}>

                {/* 게시글 본문 */}
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #c8c6c0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0ee' }}>
                    <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#37352f', margin: '0 0 0.6rem 0', lineHeight: 1.4 }}>{post.title}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: '#9b9a97' }}>
                        <span>{post.nickname}</span>
                        <span>{formatDateTime(post.created_at)}</span>
                        <span>조회 {post.views}</span>
                      </div>
                      {canDelete && (
                        <button onClick={() => void handleDelete()}
                          style={{ fontSize: '0.72rem', color: '#ef4444', background: 'none', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.2rem 0.6rem', cursor: 'pointer' }}>
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '1.25rem 1.5rem', fontSize: '0.92rem', color: '#37352f', lineHeight: 1.8, whiteSpace: 'pre-wrap', minHeight: '140px' }}>
                    {post.content}
                  </div>
                </div>

                {/* 댓글 섹션 */}
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #c8c6c0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', marginLeft: '2rem' }}>
                  <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #f0f0ee', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#37352f' }}>댓글</span>
                    <span style={{ fontSize: '0.75rem', color: '#9b9a97', background: '#f0f0ee', borderRadius: '10px', padding: '0.1rem 0.4rem' }}>{comments.length}</span>
                  </div>

                  <div>
                    {comments.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#b0aeab', fontSize: '0.82rem' }}>첫 번째 댓글을 남겨보세요</div>
                    ) : comments.map((c, i) => (
                      <div key={c.id} style={{
                        padding: '0.85rem 1.25rem',
                        borderBottom: i < comments.length - 1 ? '1px solid #f5f5f3' : 'none',
                        background: c.is_ai === 1 ? 'linear-gradient(135deg, #f0f7ff, #f8faff)' : 'white',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          {c.is_ai === 1 ? (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0078D4', background: '#e8f3ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>
                              🤖 AI 어시스턴트
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#37352f' }}>{c.author}</span>
                          )}
                          <span style={{ fontSize: '0.7rem', color: '#b0aeab' }}>{formatDateTime(c.created_at)}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.86rem', color: '#37352f', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{c.content}</p>
                      </div>
                    ))}
                  </div>

                  {me ? (
                    <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #f0f0ee', display: 'flex', gap: '0.6rem' }}>
                      <textarea
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submitComment(); } }}
                        placeholder="댓글 입력 (Enter 등록, Shift+Enter 줄바꿈)"
                        rows={2}
                        style={{ flex: 1, resize: 'none', border: '1px solid #e9e9e7', borderRadius: '8px', padding: '0.5rem 0.8rem', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, color: '#37352f' }}
                        onFocus={e => (e.currentTarget.style.borderColor = '#37352f')}
                        onBlur={e => (e.currentTarget.style.borderColor = '#e9e9e7')}
                      />
                      <button
                        onClick={() => void submitComment()}
                        disabled={submitting || !commentText.trim()}
                        style={{
                          alignSelf: 'flex-end', padding: '0.5rem 1rem',
                          background: commentText.trim() ? '#37352f' : '#e9e9e7',
                          color: commentText.trim() ? 'white' : '#b0aeab',
                          border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        {submitting ? '등록 중' : '등록'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '0.85rem', borderTop: '1px solid #f0f0ee', textAlign: 'center', fontSize: '0.82rem', color: '#9b9a97' }}>
                      댓글 작성은 로그인이 필요합니다
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* 빈 상태 */}
        {rightPanel === 'empty' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#b0aeab', gap: '0.5rem' }}>
            <div style={{ fontSize: '2.5rem' }}>🤖</div>
            <p style={{ fontSize: '0.9rem', margin: 0, color: '#9b9a97' }}>게시글을 선택하면 내용이 표시됩니다</p>
            <p style={{ fontSize: '0.78rem', margin: 0, color: '#b0aeab' }}>글을 작성하면 AI가 자동으로 댓글을 달아드립니다</p>
            {me ? (
              <button
                onClick={openWrite}
                style={{ marginTop: '0.75rem', padding: '0.5rem 1.25rem', background: '#37352f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              >
                + 첫 글 작성하기
              </button>
            ) : (
              <div style={{ marginTop: '1rem', textAlign: 'center', padding: '0.9rem 1.5rem', background: 'white', border: '1px solid #e9e9e7', borderRadius: '10px', maxWidth: '320px' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', color: '#37352f', fontWeight: 600 }}>게시판 이용 안내</p>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.78rem', color: '#9b9a97', lineHeight: 1.6 }}>
                  게시판 조회 및 글쓰기·댓글 기능은<br />
                  <strong style={{ color: '#37352f' }}>회원가입 후 로그인</strong>이 필요합니다
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <a href="/register" style={{ padding: '0.38rem 0.9rem', background: '#37352f', color: 'white', border: 'none', borderRadius: '7px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
                    회원가입
                  </a>
                  <a href="/login" style={{ padding: '0.38rem 0.9rem', background: 'white', color: '#37352f', border: '1px solid #37352f', borderRadius: '7px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
                    로그인
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
