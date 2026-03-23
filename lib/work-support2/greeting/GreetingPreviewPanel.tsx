'use client';
import { DocumentNode } from '@/types/work-support2';

interface Props {
  nodes: DocumentNode[];
}

export default function GreetingPreviewPanel({ nodes }: Props) {
  const titleNode = nodes.find(n => n.type === 'TITLE');
  const paragraphNodes = nodes.filter(n => n.type === 'PARAGRAPH');

  return (
    <div style={{ background: '#e5e7eb', minHeight: '100%', display: 'flex', justifyContent: 'center', padding: '32px 24px' }}>
      <div style={{ background: '#fff', width: '680px', maxWidth: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', flexShrink: 0 }}>

        {/* 헤더: 로고 + 그라디언트 바 + 제목 */}
        <div style={{ padding: '16px 24px 0' }}>
          {/* 로고 행 */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/work-support2/greeting-logo.png" alt="남양주시 로고" style={{ height: '28px', width: 'auto' }} />
          </div>
          {/* 그라디언트 바 */}
          <div style={{ height: '6px', background: 'linear-gradient(to right, #1a5fa8, #3bba6e)', borderRadius: '1px', marginBottom: '2px' }} />
          {/* 회색 얇은 바 */}
          <div style={{ height: '3px', background: '#c8cdd4', marginBottom: '12px' }} />
          {/* 제목 박스 */}
          <div style={{ background: 'linear-gradient(135deg, #1a5fa8 0%, #2d7dd2 60%, #3bba6e 100%)', padding: '18px 24px', marginBottom: '0' }}>
            <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff', textAlign: 'center', letterSpacing: '0.08em', fontFamily: '"Noto Sans KR", sans-serif' }}>
              {titleNode?.content || '행사명이 여기에 표시됩니다'}
            </p>
          </div>
        </div>

        {/* 본문 영역 */}
        <div style={{ padding: '20px 40px 48px' }}>
          {nodes.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '0.9rem', textAlign: 'center', padding: '60px 0' }}>
              인사말씀을 생성하면 미리보기가 표시됩니다.
            </div>
          ) : (
            <>
              {/* 구분선 */}
              <div style={{ borderTop: '2px solid #374151', marginBottom: '14px' }} />

              {/* 인사말 섹션 헤더 */}
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1f2937', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#1a5fa8', fontSize: '1.1rem' }}>■</span>
                <span style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>인사말</span>
              </div>

              {/* 본문 단락 */}
              {paragraphNodes.map((node, i) => (
                <p key={i} style={{ margin: '0 0 14px', fontSize: '0.87rem', lineHeight: 2, color: '#1f2937', fontFamily: '"Noto Sans KR", sans-serif', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>
                  {node.content}
                </p>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
