'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const MS_FONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif';
const COLORS = ['#0078D4', '#d13438'];

/* 3×3 그리드에서 각 면의 pip 위치 (row, col) */
const PIPS: Record<number, [number, number][]> = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

const DICE_CSS = `
@keyframes diceRoll {
  0%   { transform: perspective(260px) rotateX(0deg)   rotateY(0deg)   rotateZ(0deg)   scale(1.08); }
  20%  { transform: perspective(260px) rotateX(144deg)  rotateY(72deg)  rotateZ(36deg)  scale(0.88); }
  40%  { transform: perspective(260px) rotateX(288deg)  rotateY(216deg) rotateZ(108deg) scale(1.12); }
  60%  { transform: perspective(260px) rotateX(432deg)  rotateY(144deg) rotateZ(216deg) scale(0.86); }
  80%  { transform: perspective(260px) rotateX(576deg)  rotateY(288deg) rotateZ(288deg) scale(1.06); }
  100% { transform: perspective(260px) rotateX(720deg)  rotateY(360deg) rotateZ(360deg) scale(1.08); }
}
@keyframes diceLand {
  0%   { transform: perspective(260px) rotateX(-28deg) rotateY(12deg) scale(1.28); box-shadow: var(--land-shadow-max); }
  45%  { transform: perspective(260px) rotateX(10deg)  rotateY(-5deg) scale(0.91); }
  70%  { transform: perspective(260px) rotateX(-5deg)  rotateY(2deg)  scale(1.05); }
  88%  { transform: perspective(260px) rotateX(2deg)   rotateY(0deg)  scale(0.99); }
  100% { transform: none; }
}
.dice-rolling {
  animation: diceRoll 0.28s linear infinite;
  will-change: transform;
}
.dice-landed {
  animation: diceLand 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  will-change: transform;
}
`;

function DiceFace({ value, state, color }: { value: number; state: 'rolling' | 'landed' | 'idle'; color: string }) {
  return (
    <div
      className={state === 'rolling' ? 'dice-rolling' : state === 'landed' ? 'dice-landed' : ''}
      style={{
        width: '112px',
        height: '112px',
        background: 'white',
        borderRadius: '18px',
        position: 'relative',
        boxShadow: state === 'rolling'
          ? `0 0 0 3px ${color}, 0 24px 60px ${color}55, 0 8px 20px rgba(0,0,0,0.35)`
          : `0 0 0 3px ${color}, 6px 6px 0 ${color}cc, 0 10px 28px ${color}30`,
        transition: state === 'idle' ? 'box-shadow 0.3s' : 'none',
      }}
    >
      {/* 스페큘러 하이라이트 */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '18px', zIndex: 2, pointerEvents: 'none',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.15) 35%, transparent 55%)',
      }} />
      {/* 하단 그림자 엣지 */}
      <div style={{
        position: 'absolute', bottom: 0, left: '8%', right: '8%', height: '30%', borderRadius: '0 0 18px 18px', zIndex: 1, pointerEvents: 'none',
        background: 'linear-gradient(to top, rgba(0,0,0,0.07), transparent)',
      }} />
      {/* Pip 그리드 */}
      <div style={{
        position: 'absolute', inset: '13px',
        display: 'grid', gridTemplate: 'repeat(3,1fr) / repeat(3,1fr)',
        zIndex: 3,
      }}>
        {Array.from({ length: 9 }, (_, idx) => {
          const row = Math.floor(idx / 3);
          const col = idx % 3;
          const hasPip = PIPS[value]?.some(([r, c]) => r === row && c === col) ?? false;
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {hasPip && (
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: `radial-gradient(circle at 38% 32%, ${color}bb, ${color})`,
                  boxShadow: `inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(255,255,255,0.3)`,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type DiceState = 'idle' | 'rolling' | 'landed';

export default function DicePage() {
  const router = useRouter();
  const [count, setCount] = useState(2);
  const [values, setValues] = useState<number[]>([1, 1]);
  const [diceState, setDiceState] = useState<DiceState>('idle');
  const [history, setHistory] = useState<{ sum: number; vals: number[] }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const landedRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { document.title = '주사위 굴리기 | FuN fUn'; }, []);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (landedRef.current)  clearTimeout(landedRef.current);
  }, []);

  function updateCount(n: number) {
    if (diceState === 'rolling') return;
    setCount(n);
    setValues(Array(n).fill(1));
    setDiceState('idle');
  }

  function roll() {
    if (diceState === 'rolling') return;
    setDiceState('rolling');

    let ticks = 0;
    const totalTicks = 20;

    intervalRef.current = setInterval(() => {
      ticks++;
      setValues(Array.from({ length: count }, () => Math.ceil(Math.random() * 6)));

      if (ticks >= totalTicks) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        const final = Array.from({ length: count }, () => Math.ceil(Math.random() * 6));
        setValues(final);
        setDiceState('landed');
        setHistory(prev => [{ sum: final.reduce((a, b) => a + b, 0), vals: final }, ...prev].slice(0, 10));
        landedRef.current = setTimeout(() => setDiceState('idle'), 600);
      }
    }, 75);
  }

  const total = values.reduce((a, b) => a + b, 0);

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: '#f3f2f1', fontFamily: MS_FONT, color: '#323130' }}>
      <style>{DICE_CSS}</style>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 200, height: '48px', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #edebe9', display: 'flex', alignItems: 'center', padding: '0 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, cursor: 'pointer' }} onClick={() => router.push('/fun')}>
          <svg width="14" height="14" viewBox="0 0 23 23" fill="none" style={{ flexShrink: 0 }}>
            <rect x="0" y="0" width="10" height="10" fill="#f25022"/><rect x="12" y="0" width="10" height="10" fill="#7fba00"/>
            <rect x="0" y="12" width="10" height="10" fill="#00a4ef"/><rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
          </svg>
          <span style={{ color: '#0078D4', fontSize: '0.98rem', fontWeight: 600 }}>FuN fUn</span>
          <span style={{ color: '#a19f9d', fontSize: '0.98rem', margin: '0 0.2rem' }}>›</span>
          <span style={{ color: '#323130', fontSize: '0.98rem', fontWeight: 600 }}>주사위 굴리기</span>
        </div>
        <button onClick={() => router.push('/')}
          style={{ padding: '0.35rem 0.85rem', background: 'transparent', border: '1px solid #8a8886', borderRadius: '2px', cursor: 'pointer', color: '#323130', fontSize: '0.94rem' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f2f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>메인 채팅</button>
      </nav>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #003966 0%, #0078D4 100%)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.1rem', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>🎲</div>
        <div>
          <p style={{ color: '#a8d4f5', fontSize: '0.74rem', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 0.15rem', fontWeight: 600 }}>랜덤 · 주사위</p>
          <h1 style={{ color: 'white', fontSize: '1.32rem', fontWeight: 700, margin: '0 0 0.1rem', letterSpacing: '-0.3px' }}>주사위 굴리기</h1>
          <p style={{ color: '#c7e3f7', margin: 0, fontSize: '0.86rem' }}>공정한 결정을 위한 주사위!</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '1.5rem 2rem 3rem', maxWidth: '520px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1px' }}>

        {/* 주사위 수 */}
        <div style={{ background: 'white', border: '1px solid #edebe9', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#323130', marginBottom: '0.6rem' }}>주사위 수</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[1, 2].map(n => (
              <button key={n} onClick={() => updateCount(n)}
                style={{
                  width: '56px', padding: '0.45rem 0',
                  background: count === n ? '#0078D4' : 'transparent',
                  color: count === n ? 'white' : '#323130',
                  border: `1px solid ${count === n ? '#0078D4' : '#8a8886'}`,
                  borderRadius: '2px', cursor: 'pointer',
                  fontWeight: count === n ? 700 : 400,
                  fontSize: '1.06rem', transition: 'all 0.12s',
                }}
              >{n}개</button>
            ))}
          </div>
        </div>

        {/* 주사위 영역 */}
        <div style={{ background: 'white', border: '1px solid #edebe9', padding: '2rem 1.5rem', textAlign: 'center' }}>

          {/* 펠트 테이블 */}
          <div style={{
            background: 'linear-gradient(145deg, #1b4332, #2d6a4f)',
            borderRadius: '22px',
            padding: count === 1 ? '2.5rem 3rem' : '2.5rem 2rem',
            margin: '0 auto 1.75rem',
            maxWidth: '360px',
            boxShadow: 'inset 0 3px 10px rgba(0,0,0,0.45), 0 6px 18px rgba(0,0,0,0.18)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* 펠트 패턴 */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '22px', pointerEvents: 'none',
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '6px 6px',
            }} />
            {/* 테이블 테두리 */}
            <div style={{
              position: 'absolute', inset: '6px', borderRadius: '16px', pointerEvents: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
            }} />
            <div style={{ display: 'flex', gap: count === 1 ? '0' : '2.5rem', justifyContent: 'center', position: 'relative' }}>
              {values.map((v, i) => (
                <DiceFace key={i} value={v} state={diceState} color={COLORS[i]} />
              ))}
            </div>
          </div>

          {/* 합계 */}
          {count > 1 && (
            <div style={{
              display: 'inline-flex', alignItems: 'baseline', gap: '0.5rem',
              padding: '0.5rem 1.5rem',
              background: diceState === 'idle' ? '#f3f2f1' : '#e8f0fc',
              border: `1px solid ${diceState === 'idle' ? '#edebe9' : '#b8d0f7'}`,
              marginBottom: '1.4rem',
              transition: 'all 0.3s',
              borderRadius: '2px',
            }}>
              <span style={{ fontSize: '0.94rem', color: '#605e5c' }}>합계</span>
              <strong style={{ fontSize: '2.4rem', color: '#0078D4', fontWeight: 900, lineHeight: 1 }}>{total}</strong>
              <span style={{ fontSize: '0.86rem', color: '#605e5c' }}>평균 {(total / count).toFixed(1)}</span>
            </div>
          )}

          {/* 굴리기 버튼 */}
          <div>
            <button
              onClick={roll}
              disabled={diceState === 'rolling'}
              style={{
                padding: '0.65rem 2.8rem',
                background: diceState === 'rolling' ? '#f3f2f1' : '#0078D4',
                color: diceState === 'rolling' ? '#a19f9d' : 'white',
                border: `2px solid ${diceState === 'rolling' ? '#edebe9' : '#0078D4'}`,
                borderRadius: '3px',
                fontSize: '1.14rem', fontWeight: 700,
                cursor: diceState === 'rolling' ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                letterSpacing: '0.4px',
              }}
              onMouseEnter={e => { if (diceState !== 'rolling') { e.currentTarget.style.background = '#106ebe'; e.currentTarget.style.borderColor = '#106ebe'; } }}
              onMouseLeave={e => { if (diceState !== 'rolling') { e.currentTarget.style.background = '#0078D4'; e.currentTarget.style.borderColor = '#0078D4'; } }}
            >
              {diceState === 'rolling' ? '굴리는 중... 🎲' : '굴리기! 🎲'}
            </button>
          </div>
        </div>

        {/* 기록 */}
        {history.length > 0 && (
          <div style={{ background: 'white', border: '1px solid #edebe9', padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#323130', marginBottom: '0.6rem' }}>최근 기록</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {history.map((h, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.3rem 0.6rem',
                  background: i === 0 ? '#eff6ff' : 'transparent',
                  borderRadius: '2px',
                  border: `1px solid ${i === 0 ? '#bfdbfe' : 'transparent'}`,
                  transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: '0.84rem', color: '#a19f9d', width: '1.2rem', flexShrink: 0 }}>#{i + 1}</span>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {h.vals.map((v, j) => (
                      <span key={j} style={{
                        width: '22px', height: '22px', borderRadius: '4px',
                        background: COLORS[j] + '18',
                        border: `1px solid ${COLORS[j]}55`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.94rem', fontWeight: 700, color: COLORS[j],
                      }}>{v}</span>
                    ))}
                  </div>
                  {h.vals.length > 1 && (
                    <span style={{ fontSize: '0.96rem', fontWeight: 700, color: i === 0 ? '#0078D4' : '#605e5c', marginLeft: 'auto' }}>
                      합 {h.sum}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
