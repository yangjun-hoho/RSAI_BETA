'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const QUESTIONS = [
  { q: '어느 쪽이 더 나은가?', a: '야근 2시간 (내일 칼퇴)', b: '정시 퇴근 (내일 야근 가능성)' },
  { q: '더 두려운 것은?', a: '연간 감사 🔍', b: '국정감사 📺' },
  { q: '어느 상사가 낫나요?', a: '꼼꼼하지만 깐깐한 상사', b: '루즈하지만 잔소리 없는 상사' },
  { q: '더 나은 처우는?', a: '월급 10% 인상', b: '매년 5일 추가 연차' },
  { q: '어느 쪽이 더 힘드나요?', a: '악성 민원인 응대', b: '내부 결재 반려 3번' },
  { q: '더 선호하는 것은?', a: '재택근무 가능 (연봉 동결)', b: '매일 출근 (연봉 200만원 인상)' },
  { q: '어느 쪽이 낫나요?', a: '조용하고 아는 척 안 하는 팀장', b: '활발하지만 사사건건 간섭하는 팀장' },
  { q: '더 선호하는 복지는?', a: '단합 워크숍 전액 지원 (의무참가)', b: '복지 포인트 30만원 (개인 자유)' },
  { q: '어느 부서가 나은가요?', a: '업무량 많지만 인정받는 핵심부서', b: '한산하지만 빛이 안 나는 한직 부서' },
  { q: '더 힘든 상황은?', a: '아는 사람 하나 없는 타 지역 전출', b: '복잡한 인간관계의 현 부서 잔류' },
];

const MS_FONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif';
const COLOR_A = '#744da9';
const COLOR_B = '#d13438';

export default function BalancePage() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<'a' | 'b' | null>(null);
  const [votes, setVotes] = useState<{ a: number; b: number }[]>(
    () => QUESTIONS.map(() => ({ a: Math.floor(30 + Math.random() * 40), b: Math.floor(30 + Math.random() * 40) }))
  );
  const [done, setDone] = useState(false);
  const [userChoices, setUserChoices] = useState<('a' | 'b')[]>([]);

  useEffect(() => { document.title = '밸런스 게임 | FuN fUn'; }, []);

  function choose(opt: 'a' | 'b') {
    if (selected) return;
    setSelected(opt);
    const newVotes = votes.map((v, i) => i === idx ? { ...v, [opt]: v[opt] + 1 } : v);
    setVotes(newVotes);
    setUserChoices([...userChoices, opt]);
    setTimeout(() => {
      if (idx + 1 >= QUESTIONS.length) setDone(true);
      else { setIdx(idx + 1); setSelected(null); }
    }, 1800);
  }

  function reset() {
    setIdx(0); setSelected(null); setDone(false); setUserChoices([]);
    setVotes(QUESTIONS.map(() => ({ a: Math.floor(30 + Math.random() * 40), b: Math.floor(30 + Math.random() * 40) })));
  }

  const q = QUESTIONS[idx];
  const v = votes[idx];
  const total = v.a + v.b;
  const pctA = Math.round((v.a / total) * 100);
  const pctB = 100 - pctA;
  const progressPct = (idx / QUESTIONS.length) * 100;

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'linear-gradient(160deg, #f8f5ff 0%, #f3f2f1 60%)', fontFamily: MS_FONT, color: '#323130' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 200, height: '48px', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #edebe9', display: 'flex', alignItems: 'center', padding: '0 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, cursor: 'pointer' }} onClick={() => router.push('/fun')}>
          <svg width="14" height="14" viewBox="0 0 23 23" fill="none" style={{ flexShrink: 0 }}>
            <rect x="0" y="0" width="10" height="10" fill="#f25022"/><rect x="12" y="0" width="10" height="10" fill="#7fba00"/>
            <rect x="0" y="12" width="10" height="10" fill="#00a4ef"/><rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
          </svg>
          <span style={{ color: '#0078D4', fontSize: '0.98rem', fontWeight: 600 }}>FuN fUn</span>
          <span style={{ color: '#a19f9d', fontSize: '0.98rem', margin: '0 0.2rem' }}>›</span>
          <span style={{ color: '#323130', fontSize: '0.98rem', fontWeight: 600 }}>밸런스 게임</span>
        </div>
        {!done && (
          <span style={{
            fontSize: '0.86rem', color: COLOR_A, fontWeight: 700,
            background: `${COLOR_A}15`, border: `1px solid ${COLOR_A}40`,
            borderRadius: '20px', padding: '0.2rem 0.75rem', marginRight: '0.75rem',
          }}>{idx + 1} / {QUESTIONS.length}</span>
        )}
        <button onClick={() => router.push('/')} style={{ padding: '0.35rem 0.85rem', background: 'transparent', border: '1px solid #8a8886', borderRadius: '6px', cursor: 'pointer', color: '#323130', fontSize: '0.94rem' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f2f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>메인 채팅</button>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #1a0a3d 0%, #744da9 100%)', padding: '1.1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.2rem', filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.35))' }}>⚖️</div>
        <div>
          <p style={{ color: '#d8b4fe', fontSize: '0.74rem', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 0.15rem', fontWeight: 600 }}>선택 · 밸런스게임</p>
          <h1 style={{ color: 'white', fontSize: '1.32rem', fontWeight: 700, margin: '0 0 0.1rem', letterSpacing: '-0.3px' }}>공무원 밸런스 게임</h1>
          <p style={{ color: '#c4b5fd', margin: 0, fontSize: '0.86rem' }}>공무원만 이해하는 고난이도 선택!</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '1.75rem 2rem 3rem', maxWidth: '560px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {!done ? (
          <>
            {/* ── 진행 바 카드 ── */}
            <div style={{
              background: 'white',
              border: '1px solid #e0dedd',
              borderRadius: '16px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)',
              padding: '1rem 1.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: COLOR_A }}>Q{idx + 1}</span>
                <span style={{ fontSize: '0.84rem', color: '#8a8886', fontWeight: 600 }}>총 {QUESTIONS.length}문항</span>
                <span style={{ fontSize: '0.84rem', color: COLOR_A, fontWeight: 700 }}>{Math.round(progressPct)}% 완료</span>
              </div>
              <div style={{ position: 'relative', height: '8px', background: '#f0eeec', borderRadius: '999px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{
                  height: '100%', width: `${progressPct}%`,
                  background: `linear-gradient(90deg, #5c3a9a, ${COLOR_A})`,
                  borderRadius: '999px',
                  transition: 'width 0.4s ease',
                  boxShadow: `0 2px 6px ${COLOR_A}60`,
                }} />
              </div>
            </div>

            {/* ── 질문 카드 ── */}
            <div style={{
              background: 'white',
              border: '1px solid #e0dedd',
              borderRadius: '20px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)',
              padding: '2rem 1.75rem',
              overflow: 'hidden',
            }}>
              {/* 상단 컬러 줄 */}
              <div style={{ height: '4px', background: `linear-gradient(90deg, ${COLOR_A}, #d13438)`, borderRadius: '999px', marginBottom: '1.75rem' }} />

              {/* 질문 텍스트 */}
              <h2 style={{
                textAlign: 'center', fontSize: '1.22rem', fontWeight: 800,
                color: '#1b1b1b', marginBottom: '2rem', lineHeight: 1.55,
                letterSpacing: '-0.3px',
              }}>
                ⚖️ {q.q}
              </h2>

              {/* 선택지 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(['a', 'b'] as const).map(opt => {
                  const text = opt === 'a' ? q.a : q.b;
                  const pct  = opt === 'a' ? pctA : pctB;
                  const isChosen = selected === opt;
                  const otherChosen = selected && selected !== opt;
                  const optColor = opt === 'a' ? COLOR_A : COLOR_B;
                  const label = opt === 'a' ? 'A' : 'B';

                  return (
                    <div key={opt}>
                      <button
                        onClick={() => choose(opt)}
                        disabled={!!selected}
                        style={{
                          width: '100%',
                          padding: '1.1rem 1.25rem',
                          border: `2px solid ${isChosen ? optColor : otherChosen ? '#edebe9' : '#e0dedd'}`,
                          background: isChosen
                            ? `linear-gradient(135deg, ${optColor}12 0%, ${optColor}1e 100%)`
                            : otherChosen ? '#faf9f8' : 'white',
                          color: otherChosen ? '#b0adab' : '#1b1b1b',
                          cursor: selected ? 'default' : 'pointer',
                          fontSize: '1.04rem',
                          fontWeight: isChosen ? 700 : 500,
                          textAlign: 'left',
                          transition: 'all 0.15s',
                          opacity: otherChosen ? 0.6 : 1,
                          borderRadius: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.9rem',
                          boxShadow: isChosen
                            ? `0 4px 16px ${optColor}25`
                            : otherChosen ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                        }}
                        onMouseEnter={e => {
                          if (!selected) {
                            e.currentTarget.style.borderColor = optColor;
                            e.currentTarget.style.background = `linear-gradient(135deg, ${optColor}08 0%, ${optColor}12 100%)`;
                            e.currentTarget.style.boxShadow = `0 4px 16px ${optColor}20`;
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isChosen) {
                            e.currentTarget.style.borderColor = '#e0dedd';
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                          }
                        }}
                      >
                        {/* 레이블 배지 */}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '32px', height: '32px', flexShrink: 0,
                          background: isChosen ? optColor : `${optColor}18`,
                          color: isChosen ? 'white' : optColor,
                          borderRadius: '50%',
                          fontSize: '0.88rem', fontWeight: 900,
                          transition: 'all 0.15s',
                          boxShadow: isChosen ? `0 3px 8px ${optColor}50` : 'none',
                        }}>{label}</span>
                        <span style={{ lineHeight: 1.45 }}>{text}</span>
                      </button>

                      {/* 투표 결과 바 */}
                      {selected && (
                        <div style={{ marginTop: '0.45rem', padding: '0 0.4rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                            <span style={{ color: '#8a8886', fontWeight: 600 }}>나도 {label}</span>
                            <span style={{ fontWeight: 800, color: optColor }}>{pct}%</span>
                          </div>
                          <div style={{ height: '5px', background: '#f0eeec', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${pct}%`,
                              background: `linear-gradient(90deg, ${optColor}cc, ${optColor})`,
                              borderRadius: '999px',
                              transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                              boxShadow: `0 1px 4px ${optColor}50`,
                            }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 선택 후 다음 안내 */}
              {selected && (
                <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.86rem', color: '#a19f9d', fontWeight: 600 }}>
                  잠시 후 다음 질문으로 넘어갑니다...
                </p>
              )}
            </div>
          </>
        ) : (
          /* ── 완료 화면 ── */
          <div style={{
            background: 'white',
            border: '1px solid #e0dedd',
            borderRadius: '20px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.07)',
            padding: '2rem 1.75rem',
            textAlign: 'center',
          }}>
            {/* 헤더 */}
            <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🎊</div>
            <h2 style={{ fontSize: '1.56rem', fontWeight: 800, color: '#1b1b1b', marginBottom: '0.4rem' }}>게임 완료!</h2>
            <p style={{ color: '#8a8886', fontSize: '0.9rem', marginBottom: '1.75rem' }}>당신의 선택을 확인하세요</p>

            {/* A/B 통계 */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'A 선택', count: userChoices.filter(c => c === 'a').length, color: COLOR_A },
                { label: 'B 선택', count: userChoices.filter(c => c === 'b').length, color: COLOR_B },
              ].map(({ label, count, color }) => (
                <div key={label} style={{
                  flex: 1, padding: '0.85rem',
                  background: `${color}0e`,
                  border: `1.5px solid ${color}35`,
                  borderRadius: '12px',
                  boxShadow: `0 4px 12px ${color}15`,
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color }}>{count}</div>
                  <div style={{ fontSize: '0.82rem', color: '#8a8886', fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* 선택 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.75rem', textAlign: 'left' }}>
              {QUESTIONS.map((question, i) => {
                const choice = userChoices[i];
                const color = choice === 'a' ? COLOR_A : COLOR_B;
                const text = choice === 'a' ? question.a : question.b;
                return (
                  <div key={i} style={{
                    display: 'flex', gap: '0.65rem', alignItems: 'flex-start',
                    padding: '0.65rem 0.9rem',
                    background: `${color}0a`,
                    border: `1px solid ${color}28`,
                    borderRadius: '10px',
                    fontSize: '0.94rem',
                  }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '24px', height: '24px', flexShrink: 0, marginTop: '1px',
                      background: color, color: 'white',
                      borderRadius: '50%', fontWeight: 900, fontSize: '0.78rem',
                      boxShadow: `0 2px 6px ${color}50`,
                    }}>{(choice || '?').toUpperCase()}</span>
                    <span style={{ color: '#323130', lineHeight: 1.4 }}>{text}</span>
                  </div>
                );
              })}
            </div>

            {/* 다시하기 버튼 */}
            <button
              onClick={reset}
              style={{
                padding: '0.7rem 2.25rem',
                background: `linear-gradient(135deg, #5c3a9a 0%, ${COLOR_A} 100%)`,
                color: 'white', border: 'none',
                borderRadius: '50px', cursor: 'pointer',
                fontSize: '1.02rem', fontWeight: 700,
                boxShadow: `0 6px 20px ${COLOR_A}45`,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${COLOR_A}55`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 6px 20px ${COLOR_A}45`; }}
            >🎮 다시 하기</button>
          </div>
        )}
      </div>
    </div>
  );
}
