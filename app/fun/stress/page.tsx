'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const LEVELS = [
  { min: 0,   max: 10,  emoji: '😌', label: '평온',     color: '#107c10', msg: '아직 여유롭네요. 업무가 잘 되고 있군요!' },
  { min: 11,  max: 30,  emoji: '🙂', label: '보통',     color: '#0078D4', msg: '적당한 긴장감! 업무 효율이 최고조입니다.' },
  { min: 31,  max: 60,  emoji: '😤', label: '스트레스', color: '#ca5010', msg: '조금 쌓이고 있군요... 커피 한 잔 어때요?' },
  { min: 61,  max: 100, emoji: '😡', label: '분노',     color: '#d13438', msg: '으아아악!! 민원인이 또 왔나요?!' },
  { min: 101, max: 200, emoji: '🤯', label: '폭발',     color: '#744da9', msg: '결재가 또 반려됐나요? 국감이에요?!' },
  { min: 201, max: 500, emoji: '💀', label: '한계초월', color: '#323130', msg: '이 정도면 이미 전설... 고생하셨습니다.' },
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
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: '#f3f2f1', fontFamily: MS_FONT, color: '#323130' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 200, height: '48px', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #edebe9', display: 'flex', alignItems: 'center', padding: '0 2rem', gap: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, cursor: 'pointer' }} onClick={() => router.push('/fun')}>
          <svg width="14" height="14" viewBox="0 0 23 23" fill="none" style={{ flexShrink: 0 }}>
            <rect x="0" y="0" width="10" height="10" fill="#f25022"/><rect x="12" y="0" width="10" height="10" fill="#7fba00"/>
            <rect x="0" y="12" width="10" height="10" fill="#00a4ef"/><rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
          </svg>
          <span style={{ color: '#0078D4', fontSize: '0.98rem', fontWeight: 600 }}>FuN fUn</span>
          <span style={{ color: '#a19f9d', fontSize: '0.98rem', margin: '0 0.2rem' }}>›</span>
          <span style={{ color: '#323130', fontSize: '0.98rem', fontWeight: 600 }}>스트레스 해소</span>
        </div>
        <button onClick={() => router.push('/')} style={{ padding: '0.35rem 0.85rem', background: 'transparent', border: '1px solid #8a8886', borderRadius: '2px', cursor: 'pointer', color: '#323130', fontSize: '0.94rem' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f2f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>메인 채팅</button>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #1a0000 0%, #d13438 100%)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.1rem', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))', transform: shake ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.15s' }}>
          {level.emoji}
        </div>
        <div>
          <p style={{ color: '#ffc8c8', fontSize: '0.74rem', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 0.15rem', fontWeight: 600 }}>게임 · 스트레스해소</p>
          <h1 style={{ color: 'white', fontSize: '1.32rem', fontWeight: 700, margin: '0 0 0.1rem', letterSpacing: '-0.3px' }}>스트레스 해소 버튼</h1>
          <p style={{ color: '#ffb3b3', margin: 0, fontSize: '0.86rem' }}>누르면 스트레스가 풀린다고?! 현재 <strong style={{ color: 'white' }}>{level.label}</strong> 단계</p>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.3rem 0.75rem', borderRadius: '2px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ color: 'white', fontSize: '1.32rem', fontWeight: 900, letterSpacing: '-0.5px' }}>{count.toLocaleString()}</div>
          <div style={{ color: '#ffb3b3', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>클릭</div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '1.5rem 2rem 3rem', maxWidth: '560px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1px' }}>

        {/* 레벨 & 프로그레스 */}
        <div style={{ background: 'white', border: '1px solid #edebe9', padding: '1.1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.62rem' }}>{level.emoji}</span>
              <div>
                <div style={{ fontWeight: 700, color: level.color, fontSize: '1.08rem', transition: 'color 0.5s' }}>{level.label} 단계</div>
                {nextLevel && (
                  <div style={{ fontSize: '0.82rem', color: '#605e5c' }}>다음 레벨까지 {nextLevel.min - count}번</div>
                )}
              </div>
            </div>
            <div style={{ padding: '0.28rem 0.65rem', border: `1px solid ${level.color}`, borderRadius: '2px', color: level.color, fontSize: '0.86rem', fontWeight: 600, transition: 'all 0.5s' }}>
              {level.label}
            </div>
          </div>
          <div style={{ height: '4px', background: '#f3f2f1', overflow: 'hidden', marginBottom: '0.6rem' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: level.color, transition: 'width 0.2s, background 0.5s' }} />
          </div>
          <p style={{ margin: 0, fontSize: '0.96rem', color: '#605e5c' }}>{level.msg}</p>
        </div>

        {/* 버튼 영역 */}
        <div style={{ background: 'white', border: '1px solid #edebe9', padding: '2.5rem 1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          {particles.map(p => (
            <div key={p.id} style={{
              position: 'absolute', left: `calc(50% + ${p.x}px)`, top: `calc(50% + ${p.y}px)`,
              fontSize: '1.8rem', pointerEvents: 'none', animation: 'float-up 0.6s ease-out forwards',
              transform: 'translate(-50%, -50%)',
            }}>{p.emoji}</div>
          ))}

          {floatMsg && (
            <div style={{
              position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)',
              background: level.color, color: 'white',
              padding: '0.4rem 1.1rem', borderRadius: '2px',
              fontSize: '1.02rem', fontWeight: 700, whiteSpace: 'nowrap',
              animation: 'fade-up 1.2s ease-out forwards', zIndex: 10,
            }}>{floatMsg}</div>
          )}

          <button
            ref={btnRef}
            onClick={handleClick}
            style={{
              width: '170px', height: '170px', borderRadius: '50%',
              background: pressing
                ? `radial-gradient(circle, ${level.color}dd, ${level.color})`
                : `radial-gradient(circle at 35% 35%, ${level.color}cc, ${level.color})`,
              border: `6px solid ${level.color}50`,
              color: 'white', fontSize: pressing ? '3.5rem' : '4rem',
              cursor: 'pointer', transition: 'all 0.1s',
              transform: pressing ? 'scale(0.92)' : 'scale(1)',
              boxShadow: pressing
                ? `0 4px 12px ${level.color}44, inset 0 4px 12px rgba(0,0,0,0.2)`
                : `0 12px 40px ${level.color}55, inset 0 -4px 8px rgba(0,0,0,0.1)`,
              userSelect: 'none',
            }}
          >{level.emoji}</button>

          <div style={{ marginTop: '1.5rem', fontSize: '0.98rem', color: '#605e5c' }}>
            꾹 누르세요! 총 <strong style={{ color: level.color, fontWeight: 700 }}>{count}</strong>번 눌렀어요
          </div>
        </div>

        {count > 0 && (
          <div style={{ background: 'white', border: '1px solid #edebe9', padding: '0.75rem 1.25rem', textAlign: 'center' }}>
            <button
              onClick={() => setCount(0)}
              style={{ padding: '0.45rem 1.5rem', background: 'transparent', border: '1px solid #8a8886', borderRadius: '2px', cursor: 'pointer', fontSize: '0.94rem', color: '#605e5c' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f3f2f1'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >스트레스 초기화 (0으로 리셋)</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes float-up {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, calc(-50% - 50px)) scale(1.5); }
        }
        @keyframes fade-up {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          70% { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
