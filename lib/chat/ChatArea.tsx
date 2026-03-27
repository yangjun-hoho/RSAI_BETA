'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import MessageBubble, { type Message } from './MessageBubble';
import { ToolId } from './Sidebar';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  onToolClick: (toolId: ToolId) => void;
}

type CardAction =
  | { type: 'page'; path: string }
  | { type: 'tool'; toolId: ToolId };

interface ShortcutCard {
  id: string;
  title: string;
  desc: string;
  image: string;
  action: CardAction;
}

const SHORTCUT_CARDS: ShortcutCard[] = [
  {
    id: 'nano-banana',
    title: 'Nano Banana 2',
    desc: 'AI 이미지 생성 및 편집 도구',
    image: '/images/cards/nano-banana.svg',
    action: { type: 'page', path: '/work-support/nano-banana' },
  },
  {
    id: 'templates',
    title: '업무지원 템플릿',
    desc: '공무원 업무 특화 AI 템플릿',
    image: '/images/cards/templates.svg',
    action: { type: 'tool', toolId: 'templates' },
  },
  {
    id: 'chart-editor',
    title: '차트 에디터',
    desc: '데이터 시각화 차트 생성',
    image: '/images/cards/chart-editor.svg',
    action: { type: 'page', path: '/work-support/chart-editor' },
  },
  {
    id: 'latest-tools',
    title: '최신 AI 도구',
    desc: '최신 AI 서비스 한눈에 보기',
    image: '/images/cards/latest-tools.svg',
    action: { type: 'page', path: '/work-support/latest-tools' },
  },
  {
    id: 'screen-recorder',
    title: '숏폼 에디터',
    desc: '브라우저에서 숏폼 생성',
    image: '/images/cards/screen-recorder.svg',
    action: { type: 'page', path: '/shortform-editor' },
  },
];

export default function ChatArea({ messages, isLoading, onToolClick }: ChatAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  function handleCardClick(card: ShortcutCard) {
    if (card.action.type === 'page') {
      router.push(card.action.path);
    } else {
      onToolClick?.(card.action.toolId);
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        background: '#faf9f5',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <style>{`
        .chat-markdown h1,.chat-markdown h2,.chat-markdown h3{margin:0.75em 0 0.4em;font-weight:600;line-height:1.3}
        .chat-markdown h1{font-size:1.2rem}
        .chat-markdown h2{font-size:1.05rem}
        .chat-markdown h3{font-size:0.95rem}
        .chat-markdown p{margin:0.4em 0;line-height:1.7}
        .chat-markdown ul,.chat-markdown ol{margin:0.4em 0;padding-left:1.5em}
        .chat-markdown li{margin:0.2em 0}
        .chat-markdown code{background:#f0f0f0;padding:0.1em 0.35em;border-radius:3px;font-size:0.85em;font-family:monospace}
        .chat-markdown pre{background:#1e1e1e;color:#d4d4d4;padding:1em;border-radius:8px;overflow-x:auto;margin:0.5em 0}
        .chat-markdown pre code{background:none;padding:0;font-size:0.8rem}
        .chat-markdown blockquote{border-left:3px solid #d0d0d0;padding-left:1em;color:#6b6b6b;margin:0.5em 0}
        .chat-markdown strong{font-weight:600}
        .chat-markdown table{border-collapse:collapse;width:100%;margin:0.5em 0}
        .chat-markdown th,.chat-markdown td{border:1px solid #e0e0e0;padding:0.4em 0.75em;text-align:left}
        .chat-markdown th{background:#f7f6f3;font-weight:600}
        .shortcut-card { transition: all 0.18s ease; }
        .shortcut-card:hover { border-color: #c0c0bd !important; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.09) !important; }
      `}</style>

      {messages.length === 0 ? (
        /* 웰컴 화면 */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', width: '100%', maxWidth: '800px', paddingTop: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem', width: '100%' }}>
            {/* 상단: gif */}
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden' }}>
              <Image
                src="/images/welcome-animation.gif"
                alt="RSAI 로고"
                width={100}
                height={100}
                style={{ objectFit: 'cover' }}
              />
            </div>
            {/* 하단: 좌측 이미지 + 우측 텍스트 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', width: '100%', textAlign: 'left' }}>
              <Image
                src="/images/chat-title.png"
                alt="채팅 타이틀"
                width={200}
                height={80}
                style={{ objectFit: 'contain', flexShrink: 0 }}
                priority
              />
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#37352f', margin: '0 0 0.4rem 0' }}>
                  남양주 AI 에이전트 <span style={{ fontSize: '2.5rem', color: '#2383e2', fontWeight: 700 }}>RS-AI</span>에 오신 것을 환영합니다.
                </h2>
                <p style={{ color: '#9b9a97', fontSize: '0.9rem', margin: 0 }}>
                  무엇을 도와드릴까요?
                </p>
              </div>
            </div>
          </div>
          <div style={{ width: '100%', textAlign: 'left' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9b9a97', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              바로가기
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
              {SHORTCUT_CARDS.map((card) => (
                <div
                  key={card.id}
                  className="shortcut-card"
                  onClick={() => handleCardClick(card)}
                  style={{
                    background: '#fcfcfa',
                    border: '1px solid #e9e9e7',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* 3:1 이미지 영역 */}
                  <div style={{ width: '100%', aspectRatio: '3 / 1', overflow: 'hidden', background: '#f0f0ee', flexShrink: 0, position: 'relative' }}>
                    <Image
                      src={card.image}
                      alt={card.title}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  {/* 텍스트 영역 */}
                  <div style={{ padding: '0.65rem 0.8rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#37352f' }}>{card.title}</div>
                    <div style={{ fontSize: '0.7rem', color: '#9b9a97', lineHeight: 1.4 }}>{card.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* 메시지 목록 */
        <>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </>
      )}
    </div>
  );
}
