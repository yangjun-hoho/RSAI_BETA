'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AI_TOOLS = [
  {
    name: 'ChatGPT',
    emoji: '🤖',
    description: '자연스러운 대화와 텍스트 생성이 가능한 범용 AI 어시스턴트입니다.',
    url: 'https://chat.openai.com',
    color: '#10B981',
  },
  {
    name: 'Claude',
    emoji: '🧠',
    description: '깊이 있는 분석과 창의적 글쓰기에 특화된 AI 어시스턴트입니다.',
    url: 'https://claude.ai',
    color: '#F59E0B',
  },
  {
    name: 'Gemini',
    emoji: '💎',
    description: '구글의 최신 멀티모달 AI로 실시간 정보 검색이 가능합니다.',
    url: 'https://gemini.google.com',
    color: '#8B5CF6',
  },
  {
    name: 'Perplexity',
    emoji: '🔍',
    description: '실시간 웹 검색을 통한 정확한 정보를 제공하는 AI입니다.',
    url: 'https://perplexity.ai',
    color: '#06B6D4',
  },
  {
    name: 'GenSpark',
    emoji: '⚡',
    description: 'AI 기반 콘텐츠 생성 및 마케팅 자동화 플랫폼입니다.',
    url: 'https://genspark.ai',
    color: '#EF4444',
  },
  {
    name: 'Notion AI',
    emoji: '📝',
    description: '문서 작성과 업무 효율성을 위한 통합 AI 솔루션입니다.',
    url: 'https://notion.so',
    color: '#6B7280',
  },
  {
    name: 'NotebookLM',
    emoji: '📓',
    description: '구글의 AI 노트 작성 및 연구 도구로 자료를 분석합니다.',
    url: 'https://notebooklm.google.com',
    color: '#4285F4',
  },
  {
    name: 'Napkin AI',
    emoji: '📊',
    description: '텍스트를 자동으로 비주얼 다이어그램으로 변환하는 AI 도구입니다.',
    url: 'https://www.napkin.ai',
    color: '#F97316',
  },
  {
    name: 'Gamma',
    emoji: '🎨',
    description: 'AI로 자동 생성되는 아름다운 프레젠테이션 도구입니다.',
    url: 'https://gamma.app',
    color: '#EF4444',
  },
  {
    name: 'Canva AI',
    emoji: '🖌️',
    description: '디자인 초보자도 쉽게 사용하는 AI 그래픽 도구입니다.',
    url: 'https://www.canva.com',
    color: '#00C4CC',
  },
  {
    name: 'Midjourney',
    emoji: '🖼️',
    description: '예술적이고 창의적인 고품질 이미지를 생성하는 AI입니다.',
    url: 'https://midjourney.com',
    color: '#8B5CF6',
  },
  {
    name: 'Runway',
    emoji: '🎬',
    description: 'AI 기반 비디오 편집과 생성 전문 플랫폼입니다.',
    url: 'https://runwayml.com',
    color: '#7C3AED',
  },
  {
    name: 'Sora',
    emoji: '🎥',
    description: 'OpenAI의 텍스트→동영상 AI. 프롬프트 한 줄로 고품질 영상을 생성합니다.',
    url: 'https://sora.com',
    color: '#0EA5E9',
  },
  {
    name: 'Kling AI',
    emoji: '🎞️',
    description: '중국 콰이쇼우의 AI 동영상 생성 플랫폼. 사실적인 영상 품질로 주목받고 있습니다.',
    url: 'https://klingai.com',
    color: '#F97316',
  },
  {
    name: 'Pika',
    emoji: '✨',
    description: '텍스트·이미지를 영상으로 변환하는 AI 동영상 제작 플랫폼입니다.',
    url: 'https://pika.art',
    color: '#EC4899',
  },
  {
    name: 'Suno AI',
    emoji: '🎵',
    description: 'AI로 음악과 노래를 만들 수 있는 혁신적 도구입니다.',
    url: 'https://suno.ai',
    color: '#FF6B6B',
  },
  {
    name: 'ElevenLabs',
    emoji: '🎙️',
    description: '자연스러운 AI 음성 생성 및 더빙 서비스입니다.',
    url: 'https://elevenlabs.io',
    color: '#6366F1',
  },
  {
    name: 'DeepL',
    emoji: '🌐',
    description: '세계 최고 수준의 AI 번역 서비스입니다.',
    url: 'https://www.deepl.com',
    color: '#0F2B46',
  },
  {
    name: 'Cursor',
    emoji: '💻',
    description: 'AI 코딩 어시스턴트가 내장된 차세대 코드 에디터입니다.',
    url: 'https://cursor.sh',
    color: '#374151',
  },
  {
    name: 'Skywork AI',
    emoji: '☁️',
    description: '강력한 오픈소스 언어 모델로 다양한 업무를 지원합니다.',
    url: 'https://www.skywork.ai',
    color: '#0EA5E9',
  },
];

export default function LatestToolsPage() {
  const router = useRouter();

  useEffect(() => {
    document.title = '최신 AI 도구 | 남양주 AI';
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'linear-gradient(135deg, #f0f2f5 0%, #e8eef5 100%)', fontFamily: 'inherit', zIndex: 50 }}>
      {/* 헤더 */}
      <div style={{ padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1f2937' }}>🌐 최신 AI 도구</h1>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>전 세계가 사용하는 인기 AI 플랫폼 모음</p>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => router.push('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '7px', cursor: 'pointer', color: '#6b7280', fontSize: '0.82rem', fontWeight: 500 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.color = '#374151'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          홈
        </button>
      </div>

      {/* 카드 그리드 */}
      <div style={{ padding: '2rem', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1.5rem',
        }}>
          {AI_TOOLS.map((tool) => (
            <div
              key={tool.name}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.5rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.13)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
              }}
            >
              {/* 아이콘 */}
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: `${tool.color}18`,
                border: `2px solid ${tool.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem',
              }}>
                {tool.emoji}
              </div>

              {/* 이름 */}
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1f2937', textAlign: 'center' }}>
                {tool.name}
              </div>

              {/* 설명 */}
              <div style={{ fontSize: '0.72rem', color: '#6b7280', textAlign: 'center', lineHeight: 1.5, flex: 1 }}>
                {tool.description}
              </div>

              {/* 바로가기 버튼 */}
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '0.45rem 1.25rem',
                  background: tool.color,
                  color: '#ffffff',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                  marginTop: '0.25rem',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                사이트 바로가기
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
