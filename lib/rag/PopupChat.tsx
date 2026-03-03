'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

interface Source {
  index: number;
  docName: string;
  chunk: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

interface Props {
  categoryId: string;
}

const MS_FONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif';

export default function PopupChat({ categoryId }: Props) {
  const [category, setCategory] = useState<Category | null>(null);
  const [messages, setMessages]  = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound]   = useState(false);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/rag/admin/categories')
      .then(r => r.json())
      .then(data => {
        const found = (data.categories ?? []).find((c: Category) => c.id === categoryId);
        if (found) setCategory(found);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [categoryId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const userMsg: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, question, history }),
      });

      if (!res.body) throw new Error('스트림 없음');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let sources: Message['sources'] = [];

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text  = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          try {
            const json = JSON.parse(line.slice(6));
            if (json.type === 'chunk') {
              assistantContent += json.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            } else if (json.type === 'sources') {
              sources = json.sources;
            } else if (json.type === 'done') {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent, sources };
                return updated;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.' }]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }, [input, isLoading, messages, categoryId]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  /* ── 에러 화면 ── */
  if (notFound) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: MS_FONT, gap: '10px' }}>
        <div style={{ fontSize: '32px' }}>😔</div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>카테고리를 찾을 수 없습니다</div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>URL이 잘못되었거나 삭제된 카테고리입니다.</div>
        <button onClick={() => window.close()} style={{ marginTop: '8px', padding: '7px 18px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', color: '#475569', fontFamily: MS_FONT }}>
          창 닫기
        </button>
      </div>
    );
  }

  /* ── 로딩 화면 ── */
  if (!category) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94a3b8', fontSize: '13px', fontFamily: MS_FONT, gap: '8px' }}>
        <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        불러오는 중...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const iconEl = category.icon.startsWith('/')
    ? <img src={category.icon} width={18} height={18} alt="" style={{ display: 'block' }} />
    : <span style={{ fontSize: '16px', lineHeight: 1 }}>{category.icon}</span>;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: '#f8fafc',
      overflow: 'hidden', fontFamily: MS_FONT,
    }}>

      {/* ── 헤더 ── */}
      <div style={{
        padding: '0 16px',
        height: '56px',
        background: 'white',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', gap: '12px',
        flexShrink: 0,
        boxShadow: '0 1px 0 #f1f5f9',
      }}>
        {/* 아이콘 */}
        <div style={{
          width: '34px', height: '34px', borderRadius: '10px',
          background: category.color + '14',
          border: `1px solid ${category.color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {iconEl}
        </div>

        {/* 텍스트 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>
            {category.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>문서 기반 AI 답변</span>
          </div>
        </div>

        {/* 닫기 */}
        <button
          onClick={() => window.close()}
          style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'transparent', border: 'none',
            cursor: 'pointer', color: '#94a3b8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* ── 메시지 영역 ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* 빈 화면 */}
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '28px', gap: '14px' }}>
            <img
              src="/images/rag-chatbot/empty.svg"
              width={130} height={130}
              alt=""
              style={{ opacity: 0.92, filter: 'drop-shadow(0 4px 16px rgba(99,102,241,0.12))' }}
            />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', letterSpacing: '-0.2px' }}>
                {category.name} 문서에 대해 질문해보세요
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, maxWidth: '240px', margin: '0 auto' }}>
                {category.description || '등록된 문서를 기반으로 AI가 정확하게 답변합니다.'}
              </div>
            </div>
            {/* 구분선 */}
            <div style={{ width: '40px', height: '2px', borderRadius: '999px', background: `linear-gradient(90deg, ${category.color}40, ${category.color}90, ${category.color}40)` }} />
          </div>
        )}

        {/* 메시지 목록 */}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              gap: '5px',
            }}
          >
            {/* AI 아바타 + 버블 */}
            {msg.role === 'assistant' && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                {/* 아바타 */}
                <div style={{
                  width: '26px', height: '26px', borderRadius: '8px',
                  background: `linear-gradient(135deg, ${category.color}, ${category.color}bb)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: '1px',
                  boxShadow: `0 2px 8px ${category.color}30`,
                }}>
                  <img src="/images/rag-chatbot/bot-avatar.svg" width={16} height={16} alt="" style={{
                    filter: 'brightness(10)',
                    opacity: 0.9,
                  }} />
                </div>

                {/* AI 버블 */}
                <div style={{
                  maxWidth: 'calc(100% - 38px)',
                  background: 'white',
                  border: '1px solid #f1f5f9',
                  borderRadius: '4px 14px 14px 14px',
                  padding: '10px 13px',
                  fontSize: '13px', lineHeight: 1.7,
                  color: '#1e293b',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.02)',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.content
                    ? msg.content
                    : (isLoading && i === messages.length - 1)
                      ? (
                        <span style={{ display: 'flex', gap: '3px', alignItems: 'center', padding: '2px 0' }}>
                          {[0, 1, 2].map(j => (
                            <span key={j} style={{
                              width: '5px', height: '5px', borderRadius: '50%',
                              background: category.color,
                              display: 'inline-block',
                              animation: `dot-bounce 1.2s ${j * 0.2}s ease-in-out infinite`,
                              opacity: 0.7,
                            }} />
                          ))}
                        </span>
                      )
                      : ''}
                </div>
              </div>
            )}

            {/* 유저 버블 */}
            {msg.role === 'user' && (
              <div style={{
                maxWidth: '82%',
                background: category.color,
                borderRadius: '14px 4px 14px 14px',
                padding: '10px 13px',
                fontSize: '13px', lineHeight: 1.65,
                color: 'white',
                boxShadow: `0 2px 12px ${category.color}40`,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
            )}

            {/* 참고 문서 */}
            {msg.sources && msg.sources.length > 0 && (
              <div style={{ maxWidth: 'calc(100% - 38px)', marginLeft: '34px', width: '100%' }}>
                <details style={{ marginTop: '2px' }}>
                  <summary style={{
                    cursor: 'pointer', userSelect: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '4px 10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '20px',
                    fontSize: '11px', fontWeight: 600, color: '#64748b',
                    listStyle: 'none', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                  >
                    <span style={{ fontSize: '12px' }}>📚</span>
                    참고 문서 {msg.sources.length}개
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </summary>
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {msg.sources.map(s => (
                      <div key={s.index} style={{
                        background: 'white', border: '1px solid #e8eef4',
                        borderRadius: '10px', overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}>
                        {/* 파일명 헤더 */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '7px',
                          padding: '7px 10px',
                          background: '#f8fafc',
                          borderBottom: '1px solid #f1f5f9',
                        }}>
                          <span style={{
                            width: '18px', height: '18px', borderRadius: '5px',
                            background: category.color,
                            color: 'white', fontSize: '9px', fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>{s.index}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.docName.endsWith('.pdf') ? '📄' : s.docName.endsWith('.docx') ? '📝' : '📃'} {s.docName}
                          </span>
                        </div>
                        {/* 청크 내용 */}
                        <div style={{
                          padding: '8px 10px', fontSize: '11px', color: '#64748b',
                          lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                          maxHeight: '180px', overflowY: 'auto',
                          borderLeft: `2.5px solid ${category.color}40`,
                        }}>
                          {s.chunk}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        ))}

      </div>

      {/* ── 입력 영역 ── */}
      <div style={{ padding: '10px 14px 14px', background: '#f8fafc', flexShrink: 0 }}>
        <div style={{
          background: 'white',
          border: `1.5px solid ${isLoading ? category.color + '40' : '#e8eef4'}`,
          borderRadius: '14px',
          padding: '10px 12px',
          display: 'flex', gap: '10px', alignItems: 'flex-end',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onFocusCapture={e => {
          const el = e.currentTarget;
          el.style.borderColor = category.color + '60';
          el.style.boxShadow = `0 2px 16px ${category.color}15`;
        }}
        onBlurCapture={e => {
          const el = e.currentTarget;
          el.style.borderColor = '#e8eef4';
          el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
        }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${category.name} 관련 질문...`}
            rows={1}
            disabled={isLoading}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              outline: 'none', resize: 'none',
              fontSize: '13px', color: '#0f172a', lineHeight: 1.6,
              maxHeight: '96px', overflowY: 'auto',
              fontFamily: MS_FONT,
            }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 96) + 'px';
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            style={{
              width: '32px', height: '32px', borderRadius: '9px', border: 'none',
              background: input.trim() && !isLoading
                ? `linear-gradient(135deg, ${category.color}, ${category.color}cc)`
                : '#f1f5f9',
              color: input.trim() && !isLoading ? 'white' : '#94a3b8',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.2s',
              boxShadow: input.trim() && !isLoading ? `0 3px 10px ${category.color}40` : 'none',
            }}
            onMouseEnter={e => {
              if (input.trim() && !isLoading) e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
            }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
          >
            {isLoading
              ? <span style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: input.trim() ? 'white' : '#94a3b8', borderRadius: '50%', display: 'block', animation: 'spin 0.8s linear infinite' }} />
              : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
              )
            }
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#cbd5e1', marginTop: '6px', letterSpacing: '0.2px' }}>
          Enter 전송 &nbsp;·&nbsp; Shift+Enter 줄바꿈
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0);    opacity: 0.4; }
          40%            { transform: translateY(-5px); opacity: 1;   }
        }
        details summary::-webkit-details-marker { display: none; }
      `}</style>
    </div>
  );
}
