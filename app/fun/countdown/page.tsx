'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

function getMessages(pct: number): { emoji: string; msg: string } {
  if (pct >= 100) return { emoji: '🎉', msg: '퇴근이다!! 어서 짐 싸세요!!' };
  if (pct >= 90)  return { emoji: '🏃', msg: '거의 다 왔어요! 마지막 스퍼트!' };
  if (pct >= 75)  return { emoji: '😤', msg: '4분의 3 돌파! 끝이 보입니다!' };
  if (pct >= 50)  return { emoji: '😊', msg: '반환점 돌파! 이제 내리막이에요~' };
  if (pct >= 25)  return { emoji: '☕', msg: '커피 한 잔 마시며 버텨봐요!' };
  if (pct >= 10)  return { emoji: '😑', msg: '아직 한참 남았어요... 파이팅!' };
  return { emoji: '😴', msg: '이제 막 시작했네요... 긴 하루의 시작...' };
}

const MS_FONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif';

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
  const { emoji, msg } = getMessages(pct);

  const hh = Math.floor(remainMs / 3600000);
  const mm = Math.floor((remainMs % 3600000) / 60000);
  const ss = Math.floor((remainMs % 60000) / 1000);
  const fmt = (n: number) => String(n).padStart(2, '0');

  const nowStr = `${fmt(now.getHours())}:${fmt(now.getMinutes())}:${fmt(now.getSeconds())}`;
  const done = remainMs === 0;
  const barColor = pct >= 90 ? '#107c10' : pct >= 50 ? '#ca5010' : pct >= 25 ? '#0078D4' : '#d13438';

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
          <span style={{ color: '#323130', fontSize: '0.98rem', fontWeight: 600 }}>퇴근 카운트다운</span>
        </div>
        <span style={{ color: '#605e5c', fontSize: '1.02rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginRight: '1rem' }}>{nowStr}</span>
        <button onClick={() => router.push('/')} style={{ padding: '0.35rem 0.85rem', background: 'transparent', border: '1px solid #8a8886', borderRadius: '2px', cursor: 'pointer', color: '#323130', fontSize: '0.94rem' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f2f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>메인 채팅</button>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #1a0000 0%, #c50f1f 100%)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.1rem', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>⏰</div>
        <div>
          <p style={{ color: '#ffc8c8', fontSize: '0.74rem', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 0.15rem', fontWeight: 600 }}>실용 · 퇴근카운트다운</p>
          <h1 style={{ color: 'white', fontSize: '1.32rem', fontWeight: 700, margin: '0 0 0.1rem', letterSpacing: '-0.3px' }}>퇴근 카운트다운</h1>
          <p style={{ color: '#ffb3b3', margin: 0, fontSize: '0.86rem' }}>버텨라! 퇴근까지 남은 시간</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '1.5rem 2rem 3rem', maxWidth: '560px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1px' }}>

        {/* 메인 카운트다운 카드 */}
        <div style={{ background: 'white', border: '1px solid #edebe9', padding: '2rem 1.5rem', textAlign: 'center' }}>
          {/* 진행률 바 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.86rem', color: '#605e5c', fontWeight: 600 }}>{startTime} 출근</span>
              <span style={{ fontSize: '0.86rem', color: barColor, fontWeight: 700 }}>{pct.toFixed(1)}%</span>
              <span style={{ fontSize: '0.86rem', color: '#605e5c', fontWeight: 600 }}>{endTime} 퇴근</span>
            </div>
            <div style={{ height: '8px', background: '#f3f2f1', overflow: 'hidden', borderRadius: '0' }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: barColor,
                transition: 'width 1s linear, background 0.5s',
              }} />
            </div>
          </div>

          {/* 남은 시간 */}
          <div style={{ fontSize: '0.94rem', color: '#605e5c', marginBottom: '0.4rem', fontWeight: 600 }}>
            퇴근까지 남은 시간
          </div>
          {done ? (
            <div style={{ fontSize: '4.2rem', fontWeight: 900, color: '#107c10', marginBottom: '1.25rem' }}>🎉 퇴근!</div>
          ) : (
            <div style={{ fontSize: '3.9rem', fontWeight: 900, color: '#323130', fontVariantNumeric: 'tabular-nums', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>
              {fmt(hh)}:{fmt(mm)}:{fmt(ss)}
            </div>
          )}

          {/* 메시지 */}
          <div style={{
            padding: '0.85rem 1.25rem',
            background: '#f3f2f1',
            border: `1px solid #edebe9`,
            borderLeft: `4px solid ${barColor}`,
            display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left',
          }}>
            <span style={{ fontSize: '2.1rem' }}>{emoji}</span>
            <span style={{ fontWeight: 600, color: '#323130', fontSize: '1.06rem', lineHeight: 1.4 }}>{msg}</span>
          </div>
        </div>

        {/* 시간 설정 */}
        <div style={{ background: 'white', border: '1px solid #edebe9', padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#323130', marginBottom: '1rem' }}>⚙️ 시간 설정</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.86rem', color: '#605e5c', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>출근 시간</label>
              <input
                type="time" value={startTime}
                onChange={e => setStartTime(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #8a8886', borderRadius: '2px', fontSize: '1.14rem', boxSizing: 'border-box', fontWeight: 600, color: '#323130', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.86rem', color: '#605e5c', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>퇴근 시간</label>
              <input
                type="time" value={endTime}
                onChange={e => setEndTime(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #8a8886', borderRadius: '2px', fontSize: '1.14rem', boxSizing: 'border-box', fontWeight: 600, color: '#323130', outline: 'none' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[['08:00','17:00'], ['09:00','18:00'], ['10:00','19:00']].map(([s, e]) => (
              <button
                key={s}
                onClick={() => { setStartTime(s); setEndTime(e); }}
                style={{
                  flex: 1, padding: '0.45rem',
                  background: startTime === s ? '#0078D4' : 'transparent',
                  border: `1px solid ${startTime === s ? '#0078D4' : '#8a8886'}`,
                  borderRadius: '2px', cursor: 'pointer',
                  fontSize: '0.86rem',
                  color: startTime === s ? 'white' : '#323130',
                  fontWeight: startTime === s ? 700 : 400,
                  transition: 'all 0.15s',
                }}
              >{s}~{e}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
