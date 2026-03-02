'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_ITEMS = ['한식 🍚', '중식 🥟', '일식 🍣', '양식 🍝', '분식 🍜', '패스트푸드 🍔'];
const COLORS = ['#d13438', '#ca5010', '#107c10', '#0078D4', '#744da9', '#008272', '#c50f1f', '#e6a118'];

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

      // 섹터 그리기
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 텍스트
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(start + slice / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'white';
      ctx.font = `bold ${n > 6 ? 11 : 13}px "Segoe UI", sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 5;
      ctx.fillText(item, R - 12, 5);
      ctx.restore();
    });

    // 중앙 허브
    const hubGrad = ctx.createRadialGradient(CX - 4, CY - 4, 2, CX, CY, 26);
    hubGrad.addColorStop(0, 'white');
    hubGrad.addColorStop(1, '#f0eeec');
    ctx.beginPath();
    ctx.arc(CX, CY, 26, 0, 2 * Math.PI);
    ctx.fillStyle = hubGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#d1cfcd';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#323130';
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', CX, CY);
    ctx.textBaseline = 'alphabetic';
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
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'linear-gradient(160deg, #f0faf0 0%, #f3f2f1 60%)', fontFamily: MS_FONT, color: '#323130' }}>

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
        <button onClick={() => router.push('/')} style={{ padding: '0.35rem 0.85rem', background: 'transparent', border: '1px solid #8a8886', borderRadius: '6px', cursor: 'pointer', color: '#323130', fontSize: '0.94rem' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f2f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>메인 채팅</button>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #002b00 0%, #107c10 100%)', padding: '1.1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.2rem', filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.35))' }}>🍱</div>
        <div>
          <p style={{ color: '#a3e4a3', fontSize: '0.74rem', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 0.15rem', fontWeight: 600 }}>랜덤 · 점심메뉴</p>
          <h1 style={{ color: 'white', fontSize: '1.32rem', fontWeight: 700, margin: '0 0 0.1rem', letterSpacing: '-0.3px' }}>점심메뉴 결정기</h1>
          <p style={{ color: '#bbf7d0', margin: 0, fontSize: '0.86rem' }}>오늘 뭐 먹을지 룰렛이 결정해드립니다!</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '1.5rem 2rem 2.5rem', maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── 룰렛 카드 ── */}
        <div style={{
          background: 'white',
          border: '1px solid #e0dedd',
          borderRadius: '18px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)',
          padding: '1.75rem 1.25rem 1.5rem',
          textAlign: 'center',
        }}>

          {/* 룰렛 + 포인터 */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* 외부 링 (장식) */}
            <div style={{
              position: 'absolute', inset: '-8px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #767a76ff 0%, #5f6e5fff 50%, #252925ff 100%)',
              boxShadow: '0 8px 32px rgba(16,124,16,0.30), inset 0 1px 0 rgba(255,255,255,0.2)',
              zIndex: 0,
            }} />
            {/* 포인터 (삼각형) */}
            <div style={{
              position: 'absolute', right: '-22px', top: '50%', transform: 'translateY(-50%)',
              zIndex: 20,
              width: 0, height: 0,
              borderTop: '12px solid transparent',
              borderBottom: '12px solid transparent',
              borderRight: '22px solid #d34b15ff',
              filter: 'drop-shadow(-2px 0 4px rgba(0,0,0,0.25))',
            }} />
            {/* 포인터 꼭지 하이라이트 */}
            <div style={{
              position: 'absolute', right: '-19px', top: '50%', transform: 'translateY(-50%)',
              zIndex: 21,
              width: 0, height: 0,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderRight: '14px solid #ecf00bff',
            }} />
            <canvas
              ref={canvasRef} width={SIZE} height={SIZE}
              onClick={spin}
              style={{
                position: 'relative', zIndex: 5,
                cursor: spinning ? 'not-allowed' : 'pointer',
                borderRadius: '50%',
                display: 'block',
                boxShadow: '0 4px 20px rgba(0,0,0,0.18), inset 0 0 0 3px rgba(255,255,255,0.4)',
              }}
            />
          </div>

          {/* 돌리기 버튼 */}
          <div style={{ marginTop: '1.75rem' }}>
            <button
              onClick={spin}
              disabled={spinning || items.length < 2}
              style={{
                padding: '0.7rem 2.5rem',
                background: spinning
                  ? 'linear-gradient(135deg, #e0dedd 0%, #f3f2f1 100%)'
                  : 'linear-gradient(135deg, #0d6e0d 0%, #107c10 50%, #1a8f1a 100%)',
                color: spinning ? '#a19f9d' : 'white',
                border: 'none',
                borderRadius: '50px',
                fontSize: '1.06rem', fontWeight: 700,
                cursor: spinning ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                boxShadow: spinning
                  ? 'none'
                  : '0 6px 20px rgba(16,124,16,0.40), 0 2px 6px rgba(0,0,0,0.12)',
                letterSpacing: '0.3px',
              }}
              onMouseEnter={e => { if (!spinning && items.length >= 2) { e.currentTarget.style.background = 'linear-gradient(135deg, #0a5a0a 0%, #0d6e0d 50%, #107c10 100%)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,124,16,0.50), 0 3px 8px rgba(0,0,0,0.14)'; } }}
              onMouseLeave={e => { if (!spinning && items.length >= 2) { e.currentTarget.style.background = 'linear-gradient(135deg, #0d6e0d 0%, #107c10 50%, #1a8f1a 100%)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,124,16,0.40), 0 2px 6px rgba(0,0,0,0.12)'; } }}
            >
              {spinning ? '⏳ 돌아가는 중...' : '🎰 돌리기!'}
            </button>
          </div>

          {/* 결과 */}
          {result && !spinning && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1.1rem 1.5rem',
              background: 'linear-gradient(135deg, #f0faf0 0%, #e8f7e8 100%)',
              border: '1px solid #9fd89f',
              borderRadius: '14px',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(16,124,16,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
            }}>
              <div style={{ fontSize: '0.76rem', color: '#5a8f5a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.4rem' }}>오늘 점심은...</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#107c10', letterSpacing: '-0.5px' }}>{result}</div>
            </div>
          )}
        </div>

        {/* ── 항목 관리 카드 ── */}
        <div style={{
          background: 'white',
          border: '1px solid #e0dedd',
          borderRadius: '18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)',
          padding: '1.5rem',
          overflow: 'hidden',
        }}>
          {/* 카드 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '4px', height: '20px', background: 'linear-gradient(180deg, #107c10 0%, #1a8f1a 100%)', borderRadius: '2px' }} />
              <span style={{ fontSize: '0.96rem', fontWeight: 700, color: '#323130' }}>메뉴 목록</span>
            </div>
            <span style={{
              fontSize: '0.8rem', color: '#107c10', fontWeight: 700,
              background: '#e8f7e8', border: '1px solid #9fd89f',
              borderRadius: '20px', padding: '0.2rem 0.65rem',
            }}>{items.length} / 8</span>
          </div>

          {/* 메뉴 태그 목록 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '1rem' }}>
            {items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.3rem 0.55rem 0.3rem 0.85rem',
                background: `${COLORS[i % COLORS.length]}12`,
                border: `1.5px solid ${COLORS[i % COLORS.length]}50`,
                borderRadius: '50px',
                fontSize: '0.94rem', color: '#1b1b1b',
                boxShadow: `0 2px 6px ${COLORS[i % COLORS.length]}20`,
                transition: 'all 0.1s',
              }}>
                <span style={{ color: COLORS[i % COLORS.length], fontWeight: 700, fontSize: '0.72rem' }}>●</span>
                {item}
                <button
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#a19f9d', fontSize: '0.85rem', padding: '0 2px', lineHeight: 1,
                    borderRadius: '50%', width: '18px', height: '18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fde7e7'; e.currentTarget.style.color = '#d13438'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#a19f9d'; }}
                >✕</button>
              </div>
            ))}
          </div>

          {/* 추가 입력 */}
          {items.length < 8 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder="새 메뉴 입력 후 Enter 또는 +"
                style={{
                  flex: 1, padding: '0.55rem 0.9rem',
                  border: '1.5px solid #d0cece', borderRadius: '10px',
                  fontSize: '0.98rem', outline: 'none',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'all 0.12s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#107c10'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,124,16,0.10)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#d0cece'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; }}
              />
              <button
                onClick={addItem}
                style={{
                  padding: '0.55rem 1.1rem',
                  background: 'linear-gradient(135deg, #0d6e0d 0%, #107c10 100%)',
                  color: 'white', border: 'none',
                  borderRadius: '10px', cursor: 'pointer',
                  fontWeight: 700, fontSize: '1.2rem',
                  boxShadow: '0 4px 12px rgba(16,124,16,0.30)',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #0a5a0a 0%, #0d6e0d 100%)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #0d6e0d 0%, #107c10 100%)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >+</button>
            </div>
          )}

          {/* 초기화 버튼 */}
          <button
            onClick={() => setItems(DEFAULT_ITEMS)}
            style={{
              width: '100%', padding: '0.5rem',
              background: 'transparent', color: '#8a8886',
              border: '1.5px solid #e0dedd', borderRadius: '10px',
              cursor: 'pointer', fontSize: '0.9rem',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f3f2f1'; e.currentTarget.style.color = '#605e5c'; e.currentTarget.style.borderColor = '#c8c6c4'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8a8886'; e.currentTarget.style.borderColor = '#e0dedd'; }}
          >↺ 기본값으로 초기화</button>
        </div>
      </div>
    </div>
  );
}
