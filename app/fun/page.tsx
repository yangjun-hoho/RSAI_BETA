'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const APPS = [
  { id: 'mbti',      emoji: '🧠', label: 'MBTI 테스트',       desc: '나는 어떤 공무원 유형일까?',          color: '#6366f1', bg: '#eef2ff' },
  { id: 'ladder',    emoji: '🪜', label: '사다리 게임',        desc: '오늘 당번은 누구? 공정하게 결정!',      color: '#f59e0b', bg: '#fffbeb' },
  { id: 'lunch',     emoji: '🍱', label: '점심메뉴 결정기',    desc: '오늘 뭐 먹을지 룰렛이 정해줌',          color: '#10b981', bg: '#ecfdf5' },
  { id: 'countdown', emoji: '⏰', label: '퇴근 카운트다운',    desc: '퇴근까지 남은 시간... 버텨라!',         color: '#ef4444', bg: '#fef2f2' },
  { id: 'balance',   emoji: '⚖️', label: '밸런스 게임',       desc: '공무원 공감 100% 밸런스 게임',          color: '#8b5cf6', bg: '#f5f3ff' },
  { id: 'fortune',   emoji: '🔮', label: '오늘의 업무 운세',   desc: '오늘 업무운은 몇 성일까?',              color: '#ec4899', bg: '#fdf4ff' },
  { id: 'team',      emoji: '👥', label: '팀 랜덤 배정기',     desc: '눈치 없이 공정하게 팀 나누기',           color: '#06b6d4', bg: '#ecfeff' },
  { id: 'dice',      emoji: '🎲', label: '주사위 굴리기',      desc: '공정한 결정엔 주사위! 최대 6개',          color: '#6366f1', bg: '#eef2ff' },
  { id: 'rps',       emoji: '✂️', label: '가위바위보',         desc: 'AI를 이겨라! 승률을 기록해보세요',         color: '#ec4899', bg: '#fdf2f8' },
  { id: 'stress',    emoji: '😤', label: '스트레스 해소',       desc: '버튼을 누를수록 분노 게이지 상승!',        color: '#ef4444', bg: '#fef2f2' },
];

export default function FunPage() {
  const router = useRouter();
  useEffect(() => { document.title = 'FuN fUn | 아레스 AI'; }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f9ff 0%, #fdf4ff 50%, #fff7ed 100%)', padding: '2rem 1rem' }}>
      {/* 상단 버튼 바 */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.push('/')}
          style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          🏠 메인 채팅
        </button>
      </div>
      {/* 헤더 */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', marginBottom: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem' }}>
        <div style={{ fontSize: '4rem', lineHeight: 1 }}>🎮</div>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 0.25rem 0', background: 'linear-gradient(90deg, #6366f1, #ec4899, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            FuN fUn
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>
            잠깐 머리 식히고 가세요 😄 &nbsp;공무원의 小 확 幸
          </p>
        </div>
      </div>

      {/* 카드 그리드 */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.25rem' }}>
        {APPS.map(app => (
          <button
            key={app.id}
            onClick={() => router.push(`/fun/${app.id}`)}
            style={{ background: 'white', border: `2px solid ${app.color}22`, borderRadius: '16px', padding: '1.25rem 1rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 12px 32px ${app.color}33`;
              e.currentTarget.style.borderColor = app.color;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
              e.currentTarget.style.borderColor = `${app.color}22`;
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{app.emoji}</div>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1f2937', marginBottom: '0.3rem' }}>{app.label}</div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280', lineHeight: 1.45, marginBottom: '0.75rem' }}>{app.desc}</div>
            <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: app.color, color: 'white', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700 }}>
              시작 →
            </div>
          </button>
        ))}
      </div>

      <p style={{ textAlign: 'center', marginTop: '3rem', color: '#9ca3af', fontSize: '0.8rem' }}>
        업무 중 잠깐, 5분만 쉬어가세요 ☕
      </p>
    </div>
  );
}
