'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

function getMessages(pct: number): { emoji: string; msg: string; color: string } {
  if (pct >= 100) return { emoji: '🎉', msg: '퇴근이다!! 어서 짐 싸세요!!', color: '#107c10' };
  if (pct >= 90)  return { emoji: '🏃', msg: '거의 다 왔어요! 마지막 스퍼트!', color: '#107c10' };
  if (pct >= 75)  return { emoji: '😤', msg: '4분의 3 돌파! 끝이 보입니다!', color: '#ca5010' };
  if (pct >= 50)  return { emoji: '😊', msg: '반환점 돌파! 이제 내리막이에요~', color: '#ca5010' };
  if (pct >= 25)  return { emoji: '☕', msg: '커피 한 잔 마시며 버텨봐요!', color: '#0078D4' };
  if (pct >= 10)  return { emoji: '😑', msg: '아직 한참 남았어요... 파이팅!', color: '#d13438' };
  return { emoji: '😴', msg: '이제 막 시작했네요... 긴 하루의 시작...', color: '#d13438' };
}

const MS_FONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif';

// 진행률에 따른 그라디언트 색상
function barGradient(pct: number) {
  if (pct >= 90) return 'linear-gradient(90deg, #107c10, #1a9e1a)';
  if (pct >= 50) return 'linear-gradient(90deg, #ca5010, #e06020)';
  if (pct >= 25) return 'linear-gradient(90deg, #0067b8, #0078D4)';
  return 'linear-gradient(90deg, #c50f1f, #d13438)';
}

export default function CountdownPage() {
  const router = useRouter();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [now, setNow] = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { document.title = '퇴근 카운트다운 | FuN fUn'; }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function parseTime(t: string, base: Date) {
    const [h, m] = t.split(':').map(Number);
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  }

  const start = parseTime(startTime, now);
  const end = parseTime(endTime, now);
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  const remainMs = Math.max(0, end.getTime() - now.getTime());

  const pct = totalMs > 0 ? Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100)) : 0;
  const { emoji, msg, color } = getMessages(pct);

  const hh = Math.floor(remainMs / 3600000);
  const mm = Math.floor((remainMs % 3600000) / 60000);
  const ss = Math.floor((remainMs % 60000) / 1000);
  const fmt = (n: number) => String(n).padStart(2, '0');

  const nowStr = `${fmt(now.getHours())}:${fmt(now.getMinutes())}:${fmt(now.getSeconds())}`;
  const done = remainMs === 0;

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'linear-gradient(160deg, #fff5f5 0%, #f3f2f1 50%)', fontFamily: MS_FONT, color: '#323130' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 200, height: '48px', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #edebe9', display: 'flex', alignItems: 'center', padding: '0 2rem', gap: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, cursor: 'pointer' }} onClick={() => router.push('/fun')}>
          <svg width="14" height="14" viewBox="0 0 23 23" fill="none" style={{ flexShrink: 0 }}>
            <rect x="0" y="0" width="10" height="10" fill="#f25022"/><rect x="12" y="0" width="10" height="10" fill="#7fba00"/>
            <rect x="0" y="12" width="10" height="10" fill="#00a4ef"/><rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
          </svg>
          <span style={{ color: '#0078D4', fontSize: '0.98rem', fontWeight: 600 }}>FuN fUn</span>
          <span style={{ color: '#a19f9d', fontSize: '0.98rem', margin: '0 0.2rem' }}>›</span>
          <span style={{ color: '#323130', fontSize: '0.98rem', fontWeight: 600 }}>퇴근 카운트다운</span>
        </div>
        {/* 현재 시각 배지 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f3f2f1', border: '1px solid #edebe9', borderRadius: '20px', padding: '0.2rem 0.75rem', marginRight: '0.75rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#8a8886' }}>🕐</span>
          <span style={{ color: '#323130', fontSize: '0.96rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{nowStr}</span>
        </div>
        <button onClick={() => router.push('/')} style={{ padding: '0.35rem 0.85rem', background: 'transparent', border: '1px solid #8a8886', borderRadius: '6px', cursor: 'pointer', color: '#323130', fontSize: '0.94rem' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f2f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>메인 채팅</button>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #1a0000 0%, #c50f1f 100%)', padding: '1.1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.2rem', filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.35))' }}>⏰</div>
        <div>
          <p style={{ color: '#ffc8c8', fontSize: '0.74rem', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 0.15rem', fontWeight: 600 }}>실용 · 퇴근카운트다운</p>
          <h1 style={{ color: 'white', fontSize: '1.32rem', fontWeight: 700, margin: '0 0 0.1rem', letterSpacing: '-0.3px' }}>퇴근 카운트다운</h1>
          <p style={{ color: '#ffb3b3', margin: 0, fontSize: '0.86rem' }}>버텨라! 퇴근까지 남은 시간</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '1.75rem 2rem 3rem', maxWidth: '560px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* ── 메인 카운트다운 카드 ── */}
        <div style={{
          background: 'white',
          border: '1px solid #e0dedd',
          borderRadius: '20px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)',
          padding: '2rem 1.75rem 1.75rem',
          textAlign: 'center',
        }}>

          {/* 진행률 바 */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.84rem', color: '#8a8886', fontWeight: 600 }}>🏢 {startTime} 출근</span>
              <span style={{
                fontSize: '0.9rem', color: color, fontWeight: 800,
                background: `${color}15`, border: `1px solid ${color}40`,
                borderRadius: '20px', padding: '0.15rem 0.7rem',
              }}>{pct.toFixed(1)}%</span>
              <span style={{ fontSize: '0.84rem', color: '#8a8886', fontWeight: 600 }}>🏠 {endTime} 퇴근</span>
            </div>
            {/* 진행률 트랙 */}
            <div style={{ position: 'relative', height: '12px', background: '#f0eeec', borderRadius: '999px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.08)' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: barGradient(pct),
                borderRadius: '999px',
                transition: 'width 1s linear, background 0.5s',
                boxShadow: `0 2px 6px ${color}60`,
              }} />
              {/* 반짝이 효과 */}
              {pct > 5 && (
                <div style={{
                  position: 'absolute', top: '2px', left: '4px',
                  width: `${Math.min(pct - 4, 40)}%`, height: '4px',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.5), transparent)',
                  borderRadius: '999px',
                  pointerEvents: 'none',
                }} />
              )}
            </div>
          </div>

          {/* 레이블 */}
          <div style={{ fontSize: '0.88rem', color: '#8a8886', marginBottom: '0.75rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            퇴근까지 남은 시간
          </div>

          {/* 타이머 숫자 */}
          {done ? (
            <div style={{ fontSize: '4.5rem', fontWeight: 900, color: '#107c10', marginBottom: '1.5rem', lineHeight: 1 }}>🎉 퇴근!</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[fmt(hh), fmt(mm), fmt(ss)].map((val, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '82px', height: '88px',
                    background: 'linear-gradient(160deg, #fafafa 0%, #f3f2f1 100%)',
                    border: '1.5px solid #e0dedd',
                    borderRadius: '14px',
                    fontSize: '3.3rem', fontWeight: 900, color: '#1b1b1b',
                    fontVariantNumeric: 'tabular-nums',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,0.9)',
                    letterSpacing: '-2px',
                  }}>{val}</span>
                  {i < 2 && (
                    <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#c8c6c4', lineHeight: 1, marginBottom: '8px' }}>:</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* 단위 레이블 */}
          {!done && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
              {['시간', '분', '초'].map((label, i) => (
                <span key={i} style={{ display: 'inline-block', width: i < 2 ? 'calc(82px + 0.5rem + 2.4rem / 2 )' : '82px', textAlign: 'center', fontSize: '0.75rem', color: '#a19f9d', fontWeight: 600, letterSpacing: '0.5px' }}>
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* 메시지 */}
          <div style={{
            padding: '0.95rem 1.25rem',
            background: `linear-gradient(135deg, ${color}08 0%, ${color}14 100%)`,
            border: `1px solid ${color}30`,
            borderLeft: `4px solid ${color}`,
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', gap: '0.85rem', textAlign: 'left',
            boxShadow: `0 4px 16px ${color}12`,
          }}>
            <span style={{ fontSize: '2rem', flexShrink: 0 }}>{emoji}</span>
            <span style={{ fontWeight: 700, color: '#323130', fontSize: '1.02rem', lineHeight: 1.4 }}>{msg}</span>
          </div>
        </div>

        {/* ── 시간 설정 카드 ── */}
        <div style={{
          background: 'white',
          border: '1px solid #e0dedd',
          borderRadius: '18px',
          boxShadow: '0 8px 28px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)',
          padding: '1.5rem 1.75rem',
        }}>
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '4px', height: '20px', background: 'linear-gradient(180deg, #c50f1f 0%, #d13438 100%)', borderRadius: '2px' }} />
            <span style={{ fontSize: '0.96rem', fontWeight: 700, color: '#323130' }}>⚙️ 시간 설정</span>
          </div>

          {/* 입력 필드 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
            {[
              { label: '🏢 출근 시간', val: startTime, set: setStartTime },
              { label: '🏠 퇴근 시간', val: endTime, set: setEndTime },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label style={{ fontSize: '0.84rem', color: '#605e5c', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>{label}</label>
                <input
                  type="time" value={val}
                  onChange={e => set(e.target.value)}
                  style={{
                    width: '100%', padding: '0.6rem 0.85rem',
                    border: '1.5px solid #d0cece', borderRadius: '10px',
                    fontSize: '1.14rem', boxSizing: 'border-box',
                    fontWeight: 700, color: '#1b1b1b', outline: 'none',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    transition: 'all 0.12s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#c50f1f'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(197,15,31,0.10)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#d0cece'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; }}
                />
              </div>
            ))}
          </div>

          {/* 빠른 설정 프리셋 */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[['08:00','17:00'], ['09:00','18:00'], ['10:00','19:00']].map(([s, e]) => {
              const active = startTime === s && endTime === e;
              return (
                <button key={s}
                  onClick={() => { setStartTime(s); setEndTime(e); }}
                  style={{
                    flex: 1, padding: '0.5rem 0.25rem',
                    background: active ? 'linear-gradient(135deg, #b50c1a 0%, #c50f1f 100%)' : 'transparent',
                    border: `1.5px solid ${active ? '#c50f1f' : '#d0cece'}`,
                    borderRadius: '10px', cursor: 'pointer',
                    fontSize: '0.84rem',
                    color: active ? 'white' : '#605e5c',
                    fontWeight: active ? 700 : 500,
                    transition: 'all 0.15s',
                    boxShadow: active ? '0 4px 12px rgba(197,15,31,0.30)' : '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#fdf1f1'; e.currentTarget.style.borderColor = '#c50f1f'; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#d0cece'; } }}
                >{s}~{e}</button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
