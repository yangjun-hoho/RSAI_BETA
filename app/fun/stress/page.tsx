'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const LEVELS = [
  { min: 0,   max: 10,  emoji: '😌', label: '평온',     color: '#107c10', bg: '#f0fdf0', msg: '아직 여유롭네요. 업무가 잘 되고 있군요!' },
  { min: 11,  max: 30,  emoji: '🙂', label: '보통',     color: '#0078D4', bg: '#eff6ff', msg: '적당한 긴장감! 업무 효율이 최고조입니다.' },
  { min: 31,  max: 60,  emoji: '😤', label: '스트레스', color: '#ca5010', bg: '#fff8f0', msg: '조금 쌓이고 있군요... 커피 한 잔 어때요?' },
  { min: 61,  max: 100, emoji: '😡', label: '분노',     color: '#d13438', bg: '#fff0f0', msg: '으아아악!! 민원인이 또 왔나요?!' },
  { min: 101, max: 200, emoji: '🤯', label: '폭발',     color: '#744da9', bg: '#faf5ff', msg: '결재가 또 반려됐나요? 국감이에요?!' },
  { min: 201, max: 500, emoji: '💀', label: '한계초월', color: '#323130', bg: '#f3f2f1', msg: '이 정도면 이미 전설... 고생하셨습니다.' },
];

const CLICK_MSGS = [
  '후련하다!', '또 눌러!', '시원해!', '한 번 더!', '아직 부족해!',
  '화가 풀려!', '누를수록 좋아!', '이게 뭔지 알아?', '계속 눌러!', '잠깐, 숨 쉬어요!',
];

const SPARKS = ['💢','💥','⚡','🔥','✨','💫'];

interface Particle { id: number; x: number; y: number; emoji: string; vx: number; vy: number; }

const MS_FONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif';

export default function StressPage() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [pressing, setPressing] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatMsg, setFloatMsg] = useState('');
  const [shake, setShake] = useState(false);
  const pIdRef = useRef(0);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { document.title = '스트레스 해소 | FuN fUn'; }, []);

  useEffect(() => {
    if (particles.length === 0) return;
    const t = setTimeout(() => setParticles(prev => prev.slice(-6)), 600);
    return () => clearTimeout(t);
  }, [particles]);

  function getLevel(n: number) {
    return LEVELS.find(l => n >= l.min && n <= l.max) || LEVELS[LEVELS.length - 1];
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const newCount = count + 1;
    setCount(newCount);
    setPressing(true);
    setShake(true);
    setTimeout(() => { setPressing(false); setShake(false); }, 150);

    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const n = Math.min(3, Math.floor(newCount / 20) + 1);
      const newPs: Particle[] = Array.from({ length: n }, () => ({
        id: pIdRef.current++,
        x: e.clientX - rect.left + (Math.random() - 0.5) * 40,
        y: e.clientY - rect.top + (Math.random() - 0.5) * 20,
        emoji: SPARKS[Math.floor(Math.random() * SPARKS.length)],
        vx: (Math.random() - 0.5) * 60,
        vy: -(Math.random() * 40 + 20),
      }));
      setParticles(prev => [...prev, ...newPs].slice(-12));
    }

    if (newCount % 5 === 0) {
      setFloatMsg(CLICK_MSGS[Math.floor(Math.random() * CLICK_MSGS.length)]);
      setTimeout(() => setFloatMsg(''), 1200);
    }
  }

  const level = getLevel(count);
  const nextLevel = LEVELS.find(l => l.min > count);
  const progress = nextLevel
    ? ((count - level.min) / (nextLevel.min - level.min)) * 100
    : 100;

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: `linear-gradient(160deg, ${level.bg} 0%, #f3f2f1 50%)`, fontFamily: MS_FONT, color: '#323130', transition: 'background 0.5s' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 200, height: '48px', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #edebe9', display: 'flex', alignItems: 'center', padding: '0 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, cursor: 'pointer' }} onClick={() => router.push('/fun')}>
          <svg width="14" height="14" viewBox="0 0 23 23" fill="none" style={{ flexShrink: 0 }}>
            <rect x="0" y="0" width="10" height="10" fill="#f25022"/><rect x="12" y="0" width="10" height="10" fill="#7fba00"/>
            <rect x="0" y="12" width="10" height="10" fill="#00a4ef"/><rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
          </svg>
          <span style={{ color: '#0078D4', fontSize: '0.98rem', fontWeight: 600 }}>FuN fUn</span>
          <span style={{ color: '#a19f9d', fontSize: '0.98rem', margin: '0 0.2rem' }}>›</span>
          <span style={{ color: '#323130', fontSize: '0.98rem', fontWeight: 600 }}>스트레스 해소</span>
        </div>
        <button onClick={() => router.push('/')} style={{ padding: '0.35rem 0.85rem', background: 'transparent', border: '1px solid #8a8886', borderRadius: '6px', cursor: 'pointer', color: '#323130', fontSize: '0.94rem' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f2f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>메인 채팅</button>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #1a0000 0%, #d13438 100%)', padding: '1.1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.2rem', filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.35))', transform: shake ? 'scale(1.25) rotate(-5deg)' : 'scale(1)', transition: 'transform 0.15s' }}>
          {level.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#ffc8c8', fontSize: '0.74rem', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 0.15rem', fontWeight: 600 }}>게임 · 스트레스해소</p>
          <h1 style={{ color: 'white', fontSize: '1.32rem', fontWeight: 700, margin: '0 0 0.1rem', letterSpacing: '-0.3px' }}>스트레스 해소 버튼</h1>
          <p style={{ color: '#ffb3b3', margin: 0, fontSize: '0.86rem' }}>현재 <strong style={{ color: 'white' }}>{level.label}</strong> 단계</p>
        </div>
        {/* 클릭 카운터 배지 */}
        <div style={{
          background: 'rgba(0,0,0,0.30)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: '14px',
          padding: '0.45rem 1rem',
          textAlign: 'center', flexShrink: 0,
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>{count.toLocaleString()}</div>
          <div style={{ color: '#ffb3b3', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '0.15rem' }}>클릭</div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '1.75rem 2rem 3rem', maxWidth: '560px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* ── 레벨 & 프로그레스 카드 ── */}
        <div style={{
          background: 'white',
          border: `1.5px solid ${level.color}30`,
          borderRadius: '18px',
          boxShadow: `0 8px 28px ${level.color}14, 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)`,
          padding: '1.25rem 1.5rem',
          transition: 'border-color 0.5s, box-shadow 0.5s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '2rem' }}>{level.emoji}</span>
              <div>
                <div style={{ fontWeight: 800, color: level.color, fontSize: '1.12rem', transition: 'color 0.5s' }}>{level.label} 단계</div>
                {nextLevel ? (
                  <div style={{ fontSize: '0.82rem', color: '#8a8886', fontWeight: 600 }}>다음 레벨까지 <strong style={{ color: level.color }}>{nextLevel.min - count}</strong>번</div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: '#8a8886', fontWeight: 600 }}>최고 단계 도달! 🏆</div>
                )}
              </div>
            </div>
            <span style={{
              padding: '0.3rem 0.85rem',
              background: `${level.color}14`,
              border: `1.5px solid ${level.color}50`,
              borderRadius: '50px',
              color: level.color, fontSize: '0.86rem', fontWeight: 700,
              transition: 'all 0.5s',
              boxShadow: `0 2px 8px ${level.color}20`,
            }}>{level.label}</span>
          </div>

          {/* 진행 바 */}
          <div style={{ position: 'relative', height: '10px', background: '#f0eeec', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.85rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.08)' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: `linear-gradient(90deg, ${level.color}cc, ${level.color})`,
              borderRadius: '999px',
              transition: 'width 0.2s, background 0.5s',
              boxShadow: `0 2px 6px ${level.color}50`,
            }} />
            {progress > 8 && (
              <div style={{
                position: 'absolute', top: '2px', left: '4px',
                width: `${Math.min(progress - 6, 40)}%`, height: '4px',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.5), transparent)',
                borderRadius: '999px', pointerEvents: 'none',
              }} />
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.94rem', color: '#605e5c', lineHeight: 1.5 }}>{level.msg}</p>
        </div>

        {/* ── 버튼 카드 ── */}
        <div style={{
          background: 'white',
          border: '1px solid #e0dedd',
          borderRadius: '22px',
          boxShadow: '0 14px 44px rgba(0,0,0,0.10), 0 4px 14px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)',
          padding: '2.5rem 1.5rem 2rem',
          textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* 파티클 */}
          {particles.map(p => (
            <div key={p.id} style={{
              position: 'absolute', left: `calc(50% + ${p.x}px)`, top: `calc(50% + ${p.y}px)`,
              fontSize: '2rem', pointerEvents: 'none', animation: 'float-up 0.6s ease-out forwards',
              transform: 'translate(-50%, -50%)', zIndex: 20,
            }}>{p.emoji}</div>
          ))}

          {/* 플로팅 메시지 */}
          {floatMsg && (
            <div style={{
              position: 'absolute', top: '1.25rem', left: '50%', transform: 'translateX(-50%)',
              background: `linear-gradient(135deg, ${level.color}dd, ${level.color})`,
              color: 'white',
              padding: '0.45rem 1.25rem', borderRadius: '50px',
              fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap',
              animation: 'fade-up 1.2s ease-out forwards', zIndex: 30,
              boxShadow: `0 4px 14px ${level.color}50`,
            }}>{floatMsg}</div>
          )}

          {/* 배경 글로우 */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse at 50% 50%, ${level.color}08 0%, transparent 70%)`,
            transition: 'background 0.5s',
          }} />

          {/* 메인 버튼 */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* 외부 링 (입체감) */}
            <div style={{
              position: 'absolute', inset: '-10px', borderRadius: '50%',
              background: `radial-gradient(circle at 35% 30%, ${level.color}30, ${level.color}08)`,
              transition: 'background 0.5s',
              animation: pressing ? 'none' : 'pulse-ring 2s ease-in-out infinite',
            }} />
            <button
              ref={btnRef}
              onClick={handleClick}
              style={{
                width: '265px', height: '265px', borderRadius: '50%',
                background: pressing
                  ? `radial-gradient(circle, ${level.color}ee, ${level.color})`
                  : `radial-gradient(circle at 32% 28%, ${level.color}bb, ${level.color})`,
                border: `none`,
                outline: `6px solid ${level.color}25`,
                outlineOffset: '4px',
                color: 'white', fontSize: pressing ? '5.0rem' : '6.2rem',
                cursor: 'pointer', transition: 'all 0.12s cubic-bezier(0.34,1.56,0.64,1)',
                transform: pressing ? 'scale(0.91)' : 'scale(1)',
                boxShadow: pressing
                  ? `0 4px 14px ${level.color}50, inset 0 6px 16px rgba(0,0,0,0.25), inset 0 -4px 8px rgba(255,255,255,0.1)`
                  : `0 16px 50px ${level.color}55, 0 6px 20px ${level.color}30, inset 0 -6px 12px rgba(0,0,0,0.12), inset 0 6px 12px rgba(255,255,255,0.15)`,
                userSelect: 'none',
                position: 'relative', zIndex: 2,
              }}
            >{level.emoji}</button>
          </div>

          <div style={{ marginTop: '1.75rem', fontSize: '0.96rem', color: '#8a8886', fontWeight: 500 }}>
            꾹 누르세요! 총{' '}
            <strong style={{
              color: level.color, fontWeight: 800,
              background: `${level.color}14`,
              padding: '0.1rem 0.6rem', borderRadius: '20px',
              fontSize: '1.02rem',
              transition: 'color 0.5s, background 0.5s',
            }}>{count.toLocaleString()}</strong>
            {' '}번 눌렀어요
          </div>
        </div>

        {/* ── 레벨 단계 미니맵 ── */}
        <div style={{
          background: 'white',
          border: '1px solid #e0dedd',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          padding: '1rem 1.25rem',
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#8a8886', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>레벨 단계</div>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            {LEVELS.map((lv, i) => {
              const isActive = level.label === lv.label;
              const isPast = count >= lv.min;
              return (
                <div key={i} style={{
                  flex: 1, textAlign: 'center', padding: '0.4rem 0.2rem',
                  background: isActive ? `${lv.color}18` : isPast ? `${lv.color}0a` : '#f8f7f6',
                  border: `1.5px solid ${isActive ? lv.color : isPast ? lv.color + '40' : '#e0dedd'}`,
                  borderRadius: '10px',
                  transition: 'all 0.4s',
                  boxShadow: isActive ? `0 3px 10px ${lv.color}30` : 'none',
                }}>
                  <div style={{ fontSize: '1.1rem' }}>{lv.emoji}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isActive ? lv.color : '#a19f9d', marginTop: '0.1rem' }}>{lv.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 초기화 버튼 ── */}
        {count > 0 && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setCount(0)}
              style={{
                padding: '0.55rem 1.75rem',
                background: 'transparent', color: '#8a8886',
                border: '1.5px solid #d0cece', borderRadius: '50px',
                cursor: 'pointer', fontSize: '0.94rem', fontWeight: 600,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fdf1f1'; e.currentTarget.style.borderColor = '#d13438'; e.currentTarget.style.color = '#d13438'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#d0cece'; e.currentTarget.style.color = '#8a8886'; }}
            >↺ 스트레스 초기화</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes float-up {
          0%   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, calc(-50% - 60px)) scale(1.6); }
        }
        @keyframes fade-up {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
          70%  { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50%) translateY(-22px); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);    opacity: 0.6; }
          50%  { transform: scale(1.08); opacity: 0.3; }
          100% { transform: scale(1);    opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
