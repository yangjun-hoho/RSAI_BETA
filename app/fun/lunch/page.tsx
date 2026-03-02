'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_ITEMS = ['한식 🍚', '중식 🥟', '일식 🍣', '양식 🍝', '분식 🍜', '패스트푸드 🍔'];
const COLORS = ['#d13438','#ca5010','#ca5010','#107c10','#0078D4','#744da9','#008272','#c50f1f'];

const MS_FONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif';

const SIZE = 300;
const CX = SIZE / 2, CY = SIZE / 2, R = SIZE / 2 - 8;

export default function LunchPage() {
  const router = useRouter();
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [newItem, setNewItem] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const spinRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { document.title = '점심메뉴 결정기 | FuN fUn'; }, []);

  const drawWheel = useCallback(function drawWheel(ang: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const n = items.length;
    const slice = (2 * Math.PI) / n;
    ctx.clearRect(0, 0, SIZE, SIZE);

    items.forEach((item, i) => {
      const start = ang + i * slice;
      const end = start + slice;
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(start + slice / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'white';
      ctx.font = `bold ${n > 6 ? 11 : 13}px "Segoe UI", sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4;
      ctx.fillText(item, R - 12, 5);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(CX, CY, 24, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = '#edebe9';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#323130';
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 0;
    ctx.fillText('SPIN', CX, CY + 4);
  }, [items]);

  useEffect(() => { drawWheel(angle); }, [drawWheel, angle]);

  function spin() {
    if (spinning || items.length < 2) return;
    setResult(null);
    setSpinning(true);
    const extraSpins = (5 + Math.random() * 5) * 2 * Math.PI;
    const randStop = Math.random() * 2 * Math.PI;
    const totalAngle = extraSpins + randStop;
    const duration = 3500;
    const start = performance.now();
    const startAngle = angle;

    function animate(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      const cur = startAngle + totalAngle * ease;
      spinRef.current = cur;
      drawWheel(cur);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        setAngle(cur % (2 * Math.PI));
        setSpinning(false);
        const n = items.length;
        const slice = (2 * Math.PI) / n;
        const normalised = ((- cur % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const idx = Math.floor(normalised / slice) % n;
        setResult(items[idx]);
      }
    }
    requestAnimationFrame(animate);
  }

  function addItem() {
    const t = newItem.trim();
    if (!t || items.length >= 8) return;
    setItems([...items, t]);
    setNewItem('');
  }

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
          <span style={{ color: '#323130', fontSize: '0.98rem', fontWeight: 600 }}>점심메뉴 결정기</span>
        </div>
        <button onClick={() => router.push('/')} style={{ padding: '0.35rem 0.85rem', background: 'transparent', border: '1px solid #8a8886', borderRadius: '2px', cursor: 'pointer', color: '#323130', fontSize: '0.94rem' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f2f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>메인 채팅</button>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #002b00 0%, #107c10 100%)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.1rem', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>🍱</div>
        <div>
          <p style={{ color: '#a3e4a3', fontSize: '0.74rem', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 0.15rem', fontWeight: 600 }}>랜덤 · 점심메뉴</p>
          <h1 style={{ color: 'white', fontSize: '1.32rem', fontWeight: 700, margin: '0 0 0.1rem', letterSpacing: '-0.3px' }}>점심메뉴 결정기</h1>
          <p style={{ color: '#bbf7d0', margin: 0, fontSize: '0.86rem' }}>오늘 뭐 먹을지 룰렛이 결정해드립니다!</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '1.5rem 2rem 3rem', maxWidth: '560px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1px' }}>

        {/* 룰렛 카드 */}
        <div style={{ background: 'white', border: '1px solid #edebe9', padding: '2rem 1.5rem', textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div style={{
              position: 'absolute', right: '-14px', top: '50%', transform: 'translateY(-50%)',
              width: 0, height: 0,
              borderTop: '13px solid transparent',
              borderBottom: '13px solid transparent',
              borderRight: '22px solid #107c10',
              zIndex: 10,
            }} />
            <canvas
              ref={canvasRef} width={SIZE} height={SIZE}
              onClick={spin}
              style={{
                cursor: spinning ? 'not-allowed' : 'pointer',
                borderRadius: '50%',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: '2px solid #edebe9',
              }}
            />
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button
              onClick={spin}
              disabled={spinning || items.length < 2}
              style={{
                padding: '0.55rem 2rem',
                background: spinning ? '#f3f2f1' : '#0078D4',
                color: spinning ? '#a19f9d' : 'white',
                border: `1px solid ${spinning ? '#edebe9' : '#0078D4'}`,
                borderRadius: '2px',
                fontSize: '1.06rem', fontWeight: 600,
                cursor: spinning ? 'not-allowed' : 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!spinning && items.length >= 2) e.currentTarget.style.background = '#106ebe'; }}
              onMouseLeave={e => { if (!spinning && items.length >= 2) e.currentTarget.style.background = '#0078D4'; }}
            >
              {spinning ? '돌아가는 중...' : '🎰 돌리기!'}
            </button>
          </div>

          {result && !spinning && (
            <div style={{
              marginTop: '1.25rem', padding: '0.85rem 1.25rem',
              background: '#f3f2f1', border: '1px solid #edebe9',
              borderLeft: '4px solid #107c10',
              textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              <span style={{ fontSize: '1.62rem' }}>🍽️</span>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#605e5c', fontWeight: 600, marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '1px' }}>오늘 점심은...</div>
                <div style={{ fontSize: '1.56rem', fontWeight: 700, color: '#107c10' }}>{result}</div>
              </div>
            </div>
          )}
        </div>

        {/* 항목 관리 */}
        <div style={{ background: 'white', border: '1px solid #edebe9', padding: '1.1rem 1.25rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#323130', marginBottom: '0.75rem' }}>
            메뉴 목록 관리 <span style={{ color: '#a19f9d', fontWeight: 400 }}>(최대 8개)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
            {items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.25rem 0.5rem 0.25rem 0.75rem',
                background: `${COLORS[i % COLORS.length]}15`,
                border: `1px solid ${COLORS[i % COLORS.length]}40`,
                fontSize: '0.96rem', color: '#323130',
              }}>
                {item}
                <button
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a19f9d', fontSize: '1.02rem', padding: '0 2px', lineHeight: 1 }}
                >✕</button>
              </div>
            ))}
          </div>
          {items.length < 8 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder="새 메뉴 추가"
                style={{ flex: 1, padding: '0.45rem 0.65rem', border: '1px solid #8a8886', borderRadius: '2px', fontSize: '1.02rem', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderColor = '#0078D4'}
                onBlur={e => e.currentTarget.style.borderColor = '#8a8886'}
              />
              <button
                onClick={addItem}
                style={{ padding: '0.45rem 0.85rem', background: '#0078D4', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', fontWeight: 700, fontSize: '1.06rem' }}
                onMouseEnter={e => e.currentTarget.style.background = '#106ebe'}
                onMouseLeave={e => e.currentTarget.style.background = '#0078D4'}
              >+</button>
            </div>
          )}
          <button
            onClick={() => setItems(DEFAULT_ITEMS)}
            style={{ width: '100%', padding: '0.45rem', background: 'transparent', color: '#a19f9d', border: '1px solid #edebe9', borderRadius: '2px', cursor: 'pointer', fontSize: '0.9rem' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f3f2f1'; e.currentTarget.style.color = '#605e5c'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a19f9d'; }}
          >기본값으로 초기화</button>
        </div>
      </div>
    </div>
  );
}
