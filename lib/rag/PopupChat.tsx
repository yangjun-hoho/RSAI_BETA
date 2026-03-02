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

export default function PopupChat({ categoryId }: Props) {
  const [category, setCategory] = useState<Category | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const userMsg: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, question, history }),
      });

      if (!res.body) throw new Error('스트림 없음');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let sources: Message['sources'] = [];

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
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
          } catch { /* ignore parse errors */ }
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

  if (notFound) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9ca3af', gap: '12px' }}>
        <div style={{ fontSize: '36px' }}>😔</div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>카테고리를 찾을 수 없습니다</div>
        <div style={{ fontSize: '12px' }}>카테고리가 삭제되었거나 URL이 잘못되었습니다.</div>
        <button onClick={() => window.close()} style={{ marginTop: '8px', padding: '6px 16px', background: '#f3f4f6', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', color: '#374151' }}>
          창 닫기
        </button>
      </div>
    );
  }

  if (!category) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9ca3af', fontSize: '13px' }}>
        불러오는 중...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#ffffff', overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid #e9e9e7',
        background: 'white', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: category.color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', flexShrink: 0,
        }}>
          {category.icon.startsWith('/')
            ? <img src={category.icon} width={20} height={20} alt="" style={{ display: 'block', opacity: 0.8 }} />
            : category.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {category.name}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>문서 기반 AI 답변</div>
        </div>
        <button
          onClick={() => window.close()}
          title="창 닫기"
          style={{
            width: '28px', height: '28px', borderRadius: '6px',
            background: 'transparent', border: 'none',
            cursor: 'pointer', color: '#9ca3af',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#374151'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9ca3af', paddingTop: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
              {category.icon.startsWith('/')
                ? <img src={category.icon} width={40} height={40} alt="" style={{ display: 'block', opacity: 0.5 }} />
                : category.icon}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              {category.name} 문서에 대해 질문해보세요
            </div>
            <div style={{ fontSize: '11px', lineHeight: 1.5 }}>
              {category.description || '등록된 문서를 기반으로 AI가 답변합니다.'}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '88%', padding: '9px 12px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user' ? category.color : '#f3f4f6',
              color: msg.role === 'user' ? 'white' : '#111827',
              fontSize: '13px', lineHeight: 1.6,
              border: 'none',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {msg.content || (isLoading && i === messages.length - 1 ? '▍' : '')}
            </div>

            {/* 참고 문서 */}
            {msg.sources && msg.sources.length > 0 && (
              <div style={{ marginTop: '6px', width: '100%', maxWidth: '88%' }}>
                <details>
                  <summary style={{
                    cursor: 'pointer', userSelect: 'none', fontSize: '11px', fontWeight: 600,
                    color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '5px 8px', background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: '6px', listStyle: 'none',
                  }}>
                    <span>📚</span>
                    <span>참고 문서 {msg.sources.length}개</span>
                    <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#94a3b8' }}>▾</span>
                  </summary>
                  <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {msg.sources.map(s => (
                      <div key={s.index} style={{
                        border: '1px solid #e2e8f0', borderRadius: '8px',
                        background: 'white', overflow: 'hidden',
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '6px 10px', background: '#f8fafc',
                          borderBottom: '1px solid #e2e8f0',
                        }}>
                          <span style={{
                            width: '16px', height: '16px', borderRadius: '50%',
                            background: category.color, color: 'white',
                            fontSize: '9px', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>{s.index}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.docName.endsWith('.pdf') ? '📄' : s.docName.endsWith('.docx') ? '📝' : '📃'} {s.docName}
                          </span>
                        </div>
                        <div style={{
                          padding: '8px 10px', fontSize: '11px', color: '#4b5563',
                          lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                          maxHeight: '200px', overflowY: 'auto',
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

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '12px' }}>
            <span>⚙️</span> 답변 생성 중...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #e9e9e7', background: 'white', flexShrink: 0 }}>
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'flex-end',
          background: '#f9fafb', border: '1.5px solid #e5e7eb',
          borderRadius: '10px', padding: '7px 10px',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${category.name} 관련 질문...`}
            rows={1}
            disabled={isLoading}
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              resize: 'none', fontSize: '13px', color: '#111827', lineHeight: 1.5,
              maxHeight: '100px', overflowY: 'auto', fontFamily: 'inherit',
            }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 100) + 'px';
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            style={{
              width: '30px', height: '30px', borderRadius: '7px', border: 'none',
              background: input.trim() && !isLoading ? category.color : '#e5e7eb',
              color: 'white', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#d1d5db', marginTop: '5px' }}>
          Enter 전송 · Shift+Enter 줄바꿈
        </div>
      </div>
    </div>
  );
}
