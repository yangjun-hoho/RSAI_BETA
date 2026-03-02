'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const APPS = [
  { id: 'mbti',      emoji: '🧠', label: 'MBTI 테스트',       desc: '나는 어떤 공무원 유형일까?',         color: '#6366f1' },
  { id: 'ladder',    emoji: '🪜', label: '사다리 게임',        desc: '오늘 당번은 누구? 공정하게 결정!',   color: '#f59e0b' },
  { id: 'lunch',     emoji: '🍱', label: '점심메뉴 결정기',    desc: '오늘 뭐 먹을지 룰렛이 정해줌',       color: '#10b981' },
  { id: 'countdown', emoji: '⏰', label: '퇴근 카운트다운',    desc: '퇴근까지 남은 시간... 버텨라!',      color: '#ef4444' },
  { id: 'balance',   emoji: '⚖️', label: '밸런스 게임',       desc: '공무원 공감 100% 밸런스 게임',       color: '#8b5cf6' },
  { id: 'fortune',   emoji: '🔮', label: '오늘의 업무 운세',   desc: '오늘 업무운은 몇 성일까?',           color: '#ec4899' },
  { id: 'team',      emoji: '👥', label: '팀 랜덤 배정기',     desc: '눈치 없이 공정하게 팀 나누기',        color: '#06b6d4' },
  { id: 'dice',      emoji: '🎲', label: '주사위 굴리기',      desc: '공정한 결정엔 주사위! 최대 6개',      color: '#6366f1' },
  { id: 'rps',       emoji: '✂️', label: '가위바위보',         desc: 'AI를 이겨라! 승률을 기록해보세요',    color: '#ec4899' },
  { id: 'stress',    emoji: '😤', label: '스트레스 해소',       desc: '버튼을 누를수록 분노 게이지 상승!',   color: '#ef4444' },
];

interface Star  { x: number; y: number; r: number; a: number; da: number; vy: number; }
interface Planet { x: number; y: number; r: number; c1: string; c2: string; vx: number; vy: number; ring: boolean; ringA: number; }
interface ShootStar { x: number; y: number; a: number; vx: number; vy: number; len: number; }
interface Sparkle { id: number; x: number; y: number; sz: number; delay: number; dur: number; color: string; shape: 'circle' | 'diamond' | 'star'; }

const MS_FONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif';
const SPARK_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ef4444', '#14b8a6'];
const PLANETS_CFG = [
  { c1: '#c4b5fd', c2: '#3b0764' },
  { c1: '#6ee7b7', c2: '#064e3b' },
  { c1: '#fdba74', c2: '#7c2d12' },
  { c1: '#93c5fd', c2: '#1e3a8a' },
  { c1: '#f9a8d4', c2: '#831843' },
];

export default function FunPage() {
  const router = useRouter();
  const [dark, setDark]   = useState(true);
  const [ready, setReady] = useState(false);

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const animRef    = useRef(0);
  const starsRef   = useRef<Star[]>([]);
  const planetsRef = useRef<Planet[]>([]);
  const ssRef      = useRef<ShootStar[]>([]);
  const frameRef   = useRef(0);

  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  /* ── 초기 테마 로드 ── */
  useEffect(() => {
    document.title = 'FuN fUn | 아레스 AI';
    try { if (localStorage.getItem('fun-dark') === '1') setDark(true); } catch {}
    setReady(true);
  }, []);

  function toggleDark() {
    setDark(d => {
      try { localStorage.setItem('fun-dark', !d ? '1' : '0'); } catch {}
      return !d;
    });
  }

  /* ── 데이 모드 스파클 생성 ── */
  useEffect(() => {
    if (dark) { setSparkles([]); return; }
    setSparkles(Array.from({ length: 38 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      sz: Math.random() * 8 + 3,
      delay: Math.random() * 6,
      dur: Math.random() * 3.5 + 2,
      color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
      shape: (['circle', 'diamond', 'star'] as const)[Math.floor(Math.random() * 3)],
    })));
  }, [dark]);

  /* ── 다크 모드 우주 캔버스 ── */
  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    if (!dark || !ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;

    /* 별 초기화 */
    starsRef.current = Array.from({ length: 260 }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  Math.random() * 1.6 + 0.2,
      a:  Math.random() * 0.85 + 0.15,
      da: (Math.random() * 0.012 + 0.004) * (Math.random() < 0.5 ? 1 : -1),
      vy: Math.random() * 0.14 + 0.025,
    }));

    /* 행성 초기화 */
    planetsRef.current = PLANETS_CFG.map(pc => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 22 + 9,
      c1: pc.c1, c2: pc.c2,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.16,
      ring:  Math.random() < 0.55,
      ringA: Math.random() * 0.55 + 0.1,
    }));

    ssRef.current  = [];
    frameRef.current = 0;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, W, H);
      frameRef.current++;

      /* 유성 생성 */
      if (frameRef.current % 200 === 0 && ssRef.current.length < 3) {
        const angle = Math.PI / 6 + Math.random() * Math.PI / 8;
        const spd   = Math.random() * 5 + 4;
        ssRef.current.push({
          x: Math.random() * W * 0.7 + W * 0.05,
          y: Math.random() * H * 0.25,
          a: 1, len: Math.random() * 90 + 50,
          vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        });
      }

      /* 유성 그리기 */
      ssRef.current = ssRef.current.filter(s => s.a > 0.02);
      for (const ss of ssRef.current) {
        ss.a  -= 0.016;
        ss.x  += ss.vx;
        ss.y  += ss.vy;
        const mag  = Math.sqrt(ss.vx ** 2 + ss.vy ** 2);
        const tail = Math.min(ss.len, ss.len * ss.a);
        const grd  = ctx.createLinearGradient(
          ss.x - (ss.vx / mag) * tail, ss.y - (ss.vy / mag) * tail,
          ss.x, ss.y
        );
        grd.addColorStop(0, 'transparent');
        grd.addColorStop(1, `rgba(255,255,255,${ss.a.toFixed(2)})`);
        ctx.beginPath();
        ctx.strokeStyle = grd;
        ctx.lineWidth   = 1.8;
        ctx.moveTo(ss.x - (ss.vx / mag) * tail, ss.y - (ss.vy / mag) * tail);
        ctx.lineTo(ss.x, ss.y);
        ctx.stroke();
        /* 헤드 글로우 */
        const hgrd = ctx.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, 4);
        hgrd.addColorStop(0, `rgba(255,255,255,${ss.a.toFixed(2)})`);
        hgrd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = hgrd;
        ctx.fill();
      }

      /* 별 그리기 */
      for (const s of starsRef.current) {
        s.a += s.da;
        if (s.a <= 0.12 || s.a >= 1) s.da *= -1;
        s.a = Math.max(0.12, Math.min(1, s.a));
        s.y += s.vy;
        if (s.y > H + 2) { s.y = -2; s.x = Math.random() * W; }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a.toFixed(2)})`;
        ctx.fill();
        if (s.r > 1.1) {
          ctx.save();
          ctx.globalAlpha = s.a * 0.45;
          ctx.strokeStyle = 'white';
          ctx.lineWidth   = 0.5;
          ctx.beginPath();
          ctx.moveTo(s.x - s.r * 2.8, s.y); ctx.lineTo(s.x + s.r * 2.8, s.y);
          ctx.moveTo(s.x, s.y - s.r * 2.8); ctx.lineTo(s.x, s.y + s.r * 2.8);
          ctx.stroke();
          ctx.restore();
        }
      }

      /* 행성 그리기 */
      for (const p of planetsRef.current) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -p.r * 4)  p.x = W + p.r * 3;
        else if (p.x > W + p.r * 4) p.x = -p.r * 3;
        if (p.y < -p.r * 4)  p.y = H + p.r * 3;
        else if (p.y > H + p.r * 4) p.y = -p.r * 3;

        /* 외부 글로우 */
        const glow = ctx.createRadialGradient(p.x, p.y, p.r * 0.6, p.x, p.y, p.r * 3.8);
        glow.addColorStop(0, p.c1 + '50');
        glow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.8, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        /* 고리 */
        if (p.ring && p.r > 11) {
          ctx.save();
          ctx.globalAlpha = 0.38;
          ctx.strokeStyle = p.c1;
          ctx.lineWidth   = p.r * 0.22;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.r * 2.0, p.r * 0.48, p.ringA, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        /* 행성 본체 */
        const body = ctx.createRadialGradient(
          p.x - p.r * 0.33, p.y - p.r * 0.38, p.r * 0.06,
          p.x + p.r * 0.1,  p.y + p.r * 0.1,  p.r
        );
        body.addColorStop(0,   '#ffffffaa');
        body.addColorStop(0.18, p.c1);
        body.addColorStop(0.65, p.c1 + 'dd');
        body.addColorStop(1,   p.c2);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = body;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [dark, ready]);

  if (!ready) return null;

  const T = dark;

  return (
    <div style={{
      minHeight: '100vh',
      background: T ? '#050d1e' : 'linear-gradient(135deg, #f0f9ff 0%, #fdf4ff 50%, #fff7ed 100%)',
      padding: '2rem 1rem',
      fontFamily: MS_FONT,
      position: 'relative',
      transition: 'background 0.6s',
      overflow: 'hidden',
    }}>

      {/* ── 다크: 우주 캔버스 ── */}
      {T && <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />}

      {/* ── 데이: 큰 오브 ── */}
      {!T && (
        <>
          <div style={{ position: 'fixed', top: '-12%', left: '-8%',  width: '45vw', height: '45vw', background: 'radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%)',  borderRadius: '50%', pointerEvents: 'none', zIndex: 0, animation: 'orb1 16s ease-in-out infinite' }} />
          <div style={{ position: 'fixed', bottom: '-18%', right: '-6%', width: '52vw', height: '52vw', background: 'radial-gradient(circle, rgba(236,72,153,0.15), transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, animation: 'orb2 20s ease-in-out infinite' }} />
          <div style={{ position: 'fixed', top: '30%',   left: '35%',   width: '35vw', height: '35vw', background: 'radial-gradient(circle, rgba(16,185,129,0.13), transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, animation: 'orb3 13s ease-in-out infinite' }} />
          <div style={{ position: 'fixed', top: '10%',   right: '10%',  width: '25vw', height: '25vw', background: 'radial-gradient(circle, rgba(245,158,11,0.13), transparent 70%)',  borderRadius: '50%', pointerEvents: 'none', zIndex: 0, animation: 'orb4 18s ease-in-out infinite' }} />
        </>
      )}

      {/* ── 데이: 스파클 파티클 ── */}
      {!T && sparkles.map(s => (
        <div
          key={s.id}
          style={{
            position: 'fixed',
            left: `${s.x}%`,
            top:  `${s.y}%`,
            width:  `${s.sz}px`,
            height: `${s.sz}px`,
            background: s.color,
            borderRadius: s.shape === 'circle' ? '50%' : s.shape === 'diamond' ? '2px' : '50%',
            clipPath: s.shape === 'star'
              ? 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)'
              : undefined,
            transform: s.shape === 'diamond' ? 'rotate(45deg)' : undefined,
            animation: `spark ${s.dur}s ${s.delay}s ease-in-out infinite`,
            pointerEvents: 'none',
            zIndex: 0,
            filter: 'blur(0.4px)',
          }}
        />
      ))}

      {/* ── 콘텐츠 ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* 상단 버튼 바 */}
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>

          {/* 모드 토글 */}
          <button
            onClick={toggleDark}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.45rem 1.1rem',
              background: T ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
              border: T ? '1px solid rgba(255,255,255,0.18)' : '1px solid #e5e7eb',
              borderRadius: '50px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: T ? '#e2e8f0' : '#374151',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.3s',
              fontFamily: MS_FONT,
              fontWeight: 600,
              boxShadow: T ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <span style={{ fontSize: '1rem' }}>{T ? '☀️' : '🌙'}</span>
            {T ? '데이 모드' : '다크 모드'}
          </button>

          <button
            onClick={() => router.push('/')}
            style={{
              padding: '0.5rem 1rem',
              background: T ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
              border: T ? '1px solid rgba(255,255,255,0.18)' : '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: T ? '#e2e8f0' : '#374151',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.3s',
              fontFamily: MS_FONT,
              boxShadow: T ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >🏠 메인 채팅</button>
        </div>

        {/* 헤더 */}
        <div style={{ maxWidth: '1100px', margin: '0 auto', marginBottom: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem' }}>
          <div style={{
            fontSize: '4rem', lineHeight: 1,
            filter: T ? 'drop-shadow(0 0 24px rgba(99,102,241,0.9)) drop-shadow(0 0 8px rgba(236,72,153,0.6))' : 'none',
            animation: T ? 'float-icon 4s ease-in-out infinite' : 'none',
          }}>🎮</div>
          <div>
            <h1 style={{
              fontSize: '2.5rem', fontWeight: 900, margin: '0 0 0.25rem 0',
              background: 'linear-gradient(90deg, #6366f1, #ec4899, #f59e0b)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: T ? 'drop-shadow(0 0 16px rgba(99,102,241,0.6))' : 'none',
            }}>FuN fUn</h1>
            <p style={{ color: T ? '#94a3b8' : '#6b7280', fontSize: '1rem', margin: 0 }}>
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
              style={{
                background: T
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(255,255,255,0.88)',
                border: T
                  ? `1px solid rgba(255,255,255,0.11)`
                  : `2px solid ${app.color}22`,
                backdropFilter: 'blur(16px)',
                borderRadius: '18px',
                padding: '1.25rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.22s',
                boxShadow: T
                  ? `0 4px 24px rgba(0,0,0,0.35)`
                  : '0 2px 10px rgba(0,0,0,0.06)',
                fontFamily: MS_FONT,
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform    = 'translateY(-5px) scale(1.03)';
                e.currentTarget.style.boxShadow    = T
                  ? `0 20px 48px ${app.color}55, 0 0 0 1px ${app.color}60`
                  : `0 14px 36px ${app.color}36`;
                if (!T) e.currentTarget.style.borderColor = app.color;
                e.currentTarget.style.background   = T
                  ? `rgba(255,255,255,0.11)`
                  : 'rgba(255,255,255,0.98)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform  = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow  = T
                  ? '0 4px 24px rgba(0,0,0,0.35)'
                  : '0 2px 10px rgba(0,0,0,0.06)';
                if (!T) e.currentTarget.style.borderColor = `${app.color}22`;
                e.currentTarget.style.background = T
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(255,255,255,0.88)';
              }}
            >
              {/* 다크 모드: 상단 컬러 선 */}
              {T && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                  background: `linear-gradient(90deg, transparent, ${app.color}, transparent)`,
                  opacity: 0.7,
                }} />
              )}

              <div style={{
                fontSize: '2.2rem', marginBottom: '0.5rem',
                filter: T ? `drop-shadow(0 0 10px ${app.color}99)` : 'none',
                transition: 'filter 0.2s',
              }}>{app.emoji}</div>

              <div style={{
                fontWeight: 800, fontSize: '0.88rem',
                color: T ? '#e2e8f0' : '#1f2937',
                marginBottom: '0.3rem',
              }}>{app.label}</div>

              <div style={{
                fontSize: '0.72rem',
                color: T ? '#64748b' : '#6b7280',
                lineHeight: 1.45, marginBottom: '0.75rem',
              }}>{app.desc}</div>

              <div style={{
                display: 'inline-block', padding: '0.25rem 0.75rem',
                background: app.color, color: 'white',
                borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                boxShadow: T ? `0 3px 14px ${app.color}70` : 'none',
                transition: 'box-shadow 0.2s',
              }}>시작 →</div>
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: '3rem', color: T ? '#334155' : '#9ca3af', fontSize: '0.8rem' }}>
          업무 중 잠깐, 5분만 쉬어가세요 ☕
        </p>
      </div>

      <style>{`
        /* ── 데이 모드 스파클 ── */
        @keyframes spark {
          0%   { transform: translateY(0)    scale(1)   rotate(0deg);   opacity: 0.35; }
          30%  { opacity: 0.9; }
          50%  { transform: translateY(-22px) scale(1.6) rotate(180deg); opacity: 1; }
          70%  { opacity: 0.8; }
          100% { transform: translateY(0)    scale(1)   rotate(360deg); opacity: 0.35; }
        }

        /* ── 데이 모드 오브 ── */
        @keyframes orb1 {
          0%,100% { transform: translate(0,0)      scale(1);    }
          33%     { transform: translate(4%,3%)     scale(1.07); }
          66%     { transform: translate(-2%,4%)    scale(0.94); }
        }
        @keyframes orb2 {
          0%,100% { transform: translate(0,0)      scale(1);    }
          33%     { transform: translate(-4%,-3%)   scale(1.06); }
          66%     { transform: translate(3%,-4%)    scale(0.93); }
        }
        @keyframes orb3 {
          0%,100% { transform: translate(0,0)      scale(1);    }
          50%     { transform: translate(-6%,6%)    scale(1.12); }
        }
        @keyframes orb4 {
          0%,100% { transform: translate(0,0)      scale(1);    }
          40%     { transform: translate(5%,-4%)    scale(1.08); }
          80%     { transform: translate(-3%,3%)    scale(0.92); }
        }

        /* ── 다크 모드 아이콘 플로팅 ── */
        @keyframes float-icon {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
