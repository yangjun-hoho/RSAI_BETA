'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { marked } from 'marked';

/* ── 타입 ─────────────────────────────────────────── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isSearching?: boolean;
  ts?: number;
}
interface Model { id: string; name: string; }

marked.setOptions({ breaks: true });

function linkifyUrls(text: string): string {
  return text.replace(/(?<!\]\()https?:\/\/[^\s<>"')\]]+/g, url => `[${url}](${url})`);
}
function addLinkTargets(html: string): string {
  return html.replace(/<a\s+href=/g, '<a target="_blank" rel="noopener noreferrer" href=');
}
function newId() { return Math.random().toString(36).slice(2); }
function fmtTime(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts);
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h < 12 ? '오전' : '오후';
  const hh = h % 12 || 12;
  return `${ampm} ${hh}:${m.toString().padStart(2, '0')}`;
}

const LS_KEY = 'rsai-messenger-messages';
const MAX_MESSAGES = 30;

/* ── 마크다운 버블 ─────────────────────────────────── */
function AiBubble({ content, isSearching }: { content: string; isSearching?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      const html = addLinkTargets(marked.parse(linkifyUrls(content)) as string);
      ref.current.innerHTML = html;
    }
  }, [content]);

  if (isSearching && content === '') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 14px', background: '#ffffff', borderRadius: '4px 18px 18px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', maxWidth: '72%' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2383e2" strokeWidth="2" style={{ animation: 'mspin 1.2s linear infinite', flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>웹 검색 중...</span>
        <style>{`@keyframes mspin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }
  if (content === '') {
    return (
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '12px 14px', background: '#ffffff', borderRadius: '4px 18px 18px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        {[0,1,2].map(i => (
          <span key={i} style={{ width: '7px', height: '7px', background: '#b0b0b0', borderRadius: '50%', display: 'inline-block', animation: 'mtyping 1.4s infinite', animationDelay: `${i*0.2}s` }}/>
        ))}
        <style>{`@keyframes mtyping{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>
      </div>
    );
  }
  return (
    <div
      ref={ref}
      className="msg-markdown"
      style={{ padding: '10px 14px', background: '#ffffff', borderRadius: '4px 18px 18px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', fontSize: '0.875rem', lineHeight: 1.65, color: '#1f2937', wordBreak: 'break-word', maxWidth: '72%' }}
    />
  );
}

/* ── 메인 컴포넌트 ─────────────────────────────────── */
export default function MessengerPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [webSearch, setWebSearch] = useState(true);
  const webSearchRef = useRef(webSearch);
  useEffect(() => { webSearchRef.current = webSearch; }, [webSearch]);
  const [selectedModel, setSelectedModel] = useState('gpt-5.4-mini');
  const selectedModelRef = useRef(selectedModel);
  useEffect(() => { selectedModelRef.current = selectedModel; }, [selectedModel]);
  const [models, setModels] = useState<Model[]>([
    { id: 'gpt-5.4-mini', name: 'OpenAI' },
    { id: 'gemini-2.5-flash-lite', name: 'GoogleAI' },
  ]);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [nickname, setNickname] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.title = 'RS-AI 메신저';
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user?.nickname) setNickname(d.user.nickname); }).catch(()=>{});
    fetch('/api/admin/ai-model-config').then(r => r.json()).then(d => {
      if (d.openai && d.google) {
        setModels([{ id: d.openai, name: 'OpenAI' }, { id: d.google, name: 'GoogleAI' }]);
        setSelectedModel(d.openai);
      }
    }).catch(()=>{});
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        const cleaned = parsed.filter((m, i) => !(m.role === 'assistant' && !m.content && i === parsed.length - 1));
        setMessages(cleaned);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  function saveMessages(msgs: Message[]) {
    const trimmed = msgs.length > MAX_MESSAGES ? msgs.slice(-MAX_MESSAGES) : msgs;
    try { localStorage.setItem(LS_KEY, JSON.stringify(trimmed)); } catch { /* ignore */ }
  }

  const updateLastAssistant = useCallback((content: string) => {
    setMessages(prev => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === 'assistant') { next[i] = { ...next[i], content }; break; }
      }
      saveMessages(next);
      return next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    setError('');

    const userMsg: Message = { id: newId(), role: 'user', content: text, ts: Date.now() };
    const assistantMsg: Message = { id: newId(), role: 'assistant', content: '', ts: Date.now() };

    let currentMessages: Message[] = [];
    setMessages(prev => {
      currentMessages = [...prev, userMsg, assistantMsg];
      saveMessages(currentMessages);
      return currentMessages;
    });
    setIsLoading(true);

    // 직전 메시지들 (API용, ts 제거)
    const historyForApi = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyForApi, model: selectedModelRef.current, webSearch: webSearchRef.current }),
      });
      if (!response.ok) throw new Error('API 응답 오류');

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n').filter(l => l.trim())) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;
          let parsed: { error?: string; content?: string; status?: string };
          try { parsed = JSON.parse(data); } catch { continue; }
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.status === 'searching') {
            setMessages(prev => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') next[next.length - 1] = { ...last, isSearching: true };
              return next;
            });
          }
          if (parsed.content) {
            accumulated += parsed.content;
            setMessages(prev => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: accumulated, isSearching: false };
              return next;
            });
          }
        }
      }
      setMessages(prev => { saveMessages(prev); return prev; });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '오류가 발생했습니다.';
      updateLastAssistant(`❌ ${msg}`);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, updateLastAssistant]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClear() {
    if (window.confirm('대화 내역을 모두 삭제하시겠습니까?')) {
      setMessages([]);
      try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    }
  }

  // textarea 높이 자동 조절
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  const currentModel = models.find(m => m.id === selectedModel);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#f0ede6',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.18); border-radius: 4px; }
        .msg-markdown { user-select: text; }
        .msg-markdown p { margin: 0.35em 0; line-height: 1.65; }
        .msg-markdown h1,.msg-markdown h2,.msg-markdown h3 { margin: 0.6em 0 0.3em; font-weight: 600; }
        .msg-markdown h1 { font-size: 1.05rem; }
        .msg-markdown h2 { font-size: 0.95rem; }
        .msg-markdown h3 { font-size: 0.88rem; }
        .msg-markdown ul,.msg-markdown ol { margin: 0.35em 0; padding-left: 1.4em; }
        .msg-markdown li { margin: 0.15em 0; }
        .msg-markdown code { background: #f0f0f0; padding: 0.1em 0.3em; border-radius: 3px; font-size: 0.82em; font-family: monospace; }
        .msg-markdown pre { background: #1e1e1e; color: #d4d4d4; padding: 0.75em; border-radius: 8px; overflow-x: auto; margin: 0.4em 0; font-size: 0.78rem; }
        .msg-markdown pre code { background: none; padding: 0; }
        .msg-markdown strong { font-weight: 600; }
        .msg-markdown blockquote { border-left: 3px solid #d0d0d0; padding-left: 0.75em; color: #6b6b6b; margin: 0.4em 0; }
        .msg-markdown a { color: #2383e2; }
        .msg-markdown table { border-collapse: collapse; width: 100%; margin: 0.4em 0; font-size: 0.82rem; }
        .msg-markdown th,.msg-markdown td { border: 1px solid #e0e0e0; padding: 0.3em 0.6em; }
        .msg-markdown th { background: #f5f5f3; font-weight: 600; }
        .send-btn:hover { background: #1a73d4 !important; }
        .clear-btn:hover { background: rgba(255,255,255,0.18) !important; }
        .model-item:hover { background: #f3f4f6 !important; }
        .ws-btn:active { opacity: 0.7; }
        textarea { user-select: text; }
      `}</style>

      {/* ── 헤더 ─────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)',
        padding: '14px 16px 10px',
        flexShrink: 0,
        position: 'relative',
      }}>
        {/* 상단 행: 로고 + 타이틀 + 닫기 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          {/* 로고 아이콘 영역 */}
          <div style={{
            width: '38px', height: '38px', borderRadius: '12px',
            background: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 2px 8px rgba(59,130,246,0.45)',
            overflow: 'hidden',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/main-logo.png" alt="RS-AI" width={28} height={28} style={{ objectFit: 'contain' }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.2px' }}>RS-AI 메신저</span>
              {/* 온라인 인디케이터 */}
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px rgba(34,197,94,0.8)', flexShrink: 0 }} />
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
              {nickname ? `${nickname} · ` : ''}남양주 AI 에이전트
            </div>
          </div>

          {/* 대화 초기화 버튼 */}
          <button
            className="clear-btn"
            onClick={handleClear}
            title="대화 초기화"
            style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#94a3b8', flexShrink: 0, transition: 'background 0.15s' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><g transform="scale(-1,1) translate(-24,0)"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></g></svg>
          </button>
        </div>

        {/* 하단 행: 모델 선택 + 웹검색 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {/* 모델 선택 드롭다운 */}
          <button
            onClick={() => setShowModelMenu(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '20px', cursor: 'pointer', color: '#cbd5e1', fontSize: '0.72rem', fontWeight: 500,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#60a5fa" strokeWidth="1.5" fill="none"/><circle cx="8" cy="8" r="2" fill="#60a5fa"/></svg>
            {currentModel?.name ?? 'OpenAI'}
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          {showModelMenu && (
            <div style={{
              position: 'absolute', top: '32px', left: '0', zIndex: 100,
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden', minWidth: '140px',
            }}>
              {models.map(m => (
                <div
                  key={m.id}
                  className="model-item"
                  onClick={() => { setSelectedModel(m.id); setShowModelMenu(false); }}
                  style={{
                    padding: '9px 14px', cursor: 'pointer', fontSize: '0.8rem', color: '#374151',
                    display: 'flex', alignItems: 'center', gap: '7px',
                    background: m.id === selectedModel ? '#eff6ff' : 'transparent',
                    fontWeight: m.id === selectedModel ? 600 : 400,
                  }}
                >
                  {m.id === selectedModel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2383e2" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>}
                  {m.id !== selectedModel && <span style={{ width: '10px' }} />}
                  {m.name}
                </div>
              ))}
            </div>
          )}

          {/* 웹 검색 토글 */}
          <button
            className="ws-btn"
            onClick={() => setWebSearch(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px',
              background: webSearch ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${webSearch ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '20px', cursor: 'pointer',
              color: webSearch ? '#93c5fd' : '#64748b', fontSize: '0.72rem', fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            웹검색 {webSearch ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* 모델 메뉴 오버레이 닫기 */}
        {showModelMenu && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowModelMenu(false)} />
        )}
      </div>

      {/* ── 날짜 구분선 ─────────────────────────────── */}
      {messages.length > 0 && (
        <div style={{ textAlign: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
          <span style={{ fontSize: '0.68rem', color: '#9ca3af', background: 'rgba(0,0,0,0.06)', padding: '3px 10px', borderRadius: '10px' }}>
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>
      )}

      {/* ── 채팅 영역 ───────────────────────────────── */}
      <div
        onClick={() => setShowModelMenu(false)}
        style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '2px' }}
      >
        {messages.length === 0 ? (
          /* 웰컴 화면 */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '14px', padding: '20px', textAlign: 'center' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/welcome-animation.gif" alt="RS-AI" width={72} height={72} style={{ objectFit: 'cover' }} />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/chat-title.png" alt="채팅 타이틀" height={36} style={{ objectFit: 'contain', opacity: 0.9 }} />
            <p style={{ fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.7, margin: 0 }}>
              안녕하세요!<br />
              <strong style={{ color: '#374151' }}>RS-AI 메신저</strong>입니다.<br />
              무엇이든 편하게 물어보세요.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id}>
              {msg.role === 'user' ? (
                /* 사용자 버블 */
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px', gap: '6px', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '0.62rem', color: '#9ca3af', alignSelf: 'flex-end', flexShrink: 0, paddingBottom: '1px' }}>
                    {fmtTime(msg.ts)}
                  </span>
                  <div style={{
                    maxWidth: '72%', padding: '10px 14px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#ffffff', borderRadius: '18px 18px 4px 18px',
                    fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ) : (
                /* AI 버블 */
                <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-end' }}>
                  {/* AI 아바타 */}
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    background: '#e8f0fe',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: '0.65rem', fontWeight: 700, color: '#93c5fd',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                    overflow: 'hidden',
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/main-logo.png" alt="RS" width={20} height={20} style={{ objectFit: 'contain' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#374151', paddingLeft: '2px' }}>RS-AI</span>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                      <AiBubble content={msg.content} isSearching={msg.isSearching} />
                      {msg.content !== '' && (
                        <span style={{ fontSize: '0.62rem', color: '#9ca3af', flexShrink: 0, paddingBottom: '1px' }}>
                          {fmtTime(msg.ts)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── 에러 ────────────────────────────────────── */}
      {error && (
        <div style={{ padding: '6px 14px', background: '#fee2e2', borderTop: '1px solid #fca5a5', color: '#dc2626', fontSize: '0.78rem', flexShrink: 0 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── 입력 영역 ───────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        padding: '10px 12px',
        flexShrink: 0,
        display: 'flex', alignItems: 'flex-end', gap: '8px',
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          rows={1}
          style={{
            flex: 1, border: '1px solid #e5e7eb', borderRadius: '20px',
            padding: '9px 14px', fontSize: '0.875rem', lineHeight: 1.5,
            resize: 'none', outline: 'none', background: '#f9fafb',
            color: '#1f2937', fontFamily: 'inherit', minHeight: '38px', maxHeight: '120px',
            overflowY: 'auto', transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; }}
          onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            width: '38px', height: '38px', borderRadius: '50%', border: 'none',
            background: isLoading || !input.trim() ? '#d1d5db' : '#2563eb',
            color: '#fff', cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.15s',
            boxShadow: isLoading || !input.trim() ? 'none' : '0 2px 8px rgba(37,99,235,0.35)',
          }}
        >
          {isLoading ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'mspin 1s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/></svg>
          )}
        </button>
      </div>

      {/* 하단 워터마크 */}
      <div style={{ textAlign: 'center', padding: '4px 0 6px', fontSize: '0.6rem', color: '#c0bdb8', background: '#fff', flexShrink: 0 }}>
        © 2026 기획조정실 스마트도시과
      </div>
    </div>
  );
}
