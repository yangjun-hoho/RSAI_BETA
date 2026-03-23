'use client';

import { useEffect, useRef } from 'react';
import { marked } from 'marked';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isSearching?: boolean;
}

interface MessageBubbleProps {
  message: Message;
}

marked.setOptions({ breaks: true });

export default function MessageBubble({ message }: MessageBubbleProps) {
  const { role, content, isSearching } = message;
  const isUser = role === 'user';
  const htmlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isUser && htmlRef.current) {
      htmlRef.current.innerHTML = marked.parse(content) as string;
    }
  }, [content, isUser]);

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', width: '100%', maxWidth: '800px' }}>
        <div style={{
          maxWidth: '70%',
          padding: '0.5rem 1rem',
          background: '#dee8f1',
          color: '#3f3f3f',
          borderRadius: '10px 10px 4px 18px',
          fontSize: '0.9rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', width: '100%', maxWidth: '800px' }}>
      {/* AI 아바타 */}
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #d9dceb 0%, #b6aebd 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: '2px',
        fontSize: '0.75rem',
        color: '#fff',
        fontWeight: 700,
      }}>
        RS
      </div>
      <div style={{
        flex: 1,
        padding: '0.75rem 1rem',
        background: '#f7f6f3',
        borderRadius: '4px 18px 18px 18px',
        fontSize: '0.9rem',
        lineHeight: 1.7,
        color: '#37352f',
        wordBreak: 'break-word',
      }}>
        {isSearching && content === '' ? (
          /* 웹 검색 중 인디케이터 */
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2383e2" strokeWidth="2" style={{ animation: 'spin 1.2s linear infinite', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>웹 검색 중...</span>
            <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
          </div>
        ) : content === '' ? (
          /* 타이핑 인디케이터 */
          <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                width: '8px', height: '8px', background: '#9b9a97', borderRadius: '50%',
                display: 'inline-block',
                animation: 'typing 1.4s infinite',
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
            <style>{`@keyframes typing { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-8px)} }`}</style>
          </div>
        ) : (
          <div ref={htmlRef} className="chat-markdown" />
        )}
      </div>
    </div>
  );
}
