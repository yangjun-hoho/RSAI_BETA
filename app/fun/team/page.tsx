'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TEAM_COLORS = ['#0078D4', '#d13438', '#107c10', '#ca5010', '#744da9', '#008272'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getGridCols(count: number) {
  if (count === 2) return 'repeat(2, 1fr)';
  if (count === 3) return 'repeat(3, 1fr)';
  if (count === 4) return 'repeat(2, 1fr)';
  return 'repeat(3, 1fr)';
}

const MS_FONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif';

export default function TeamPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [teamCount, setTeamCount] = useState(2);
  const [teams, setTeams] = useState<string[][]>([]);
  const [animating, setAnimating] = useState(false);

  useEffect(() => { document.title = '팀 랜덤 배정기 | FuN fUn'; }, []);

  const names = input.split('\n').map(n => n.trim()).filter(Boolean);
  const canAssign = names.length >= teamCount;

  function makeTeams() {
    if (!canAssign || animating) return;
    setAnimating(true);
    setTeams([]);
    const shuffled = shuffle(names);
    const result: string[][] = Array.from({ length: teamCount }, () => []);
    shuffled.forEach((name, i) => result[i % teamCount].push(name));

    let count = 0;
    const interval = setInterval(() => {
      count++;
      const tempShuffled = shuffle(names);
      const temp: string[][] = Array.from({ length: teamCount }, () => []);
      tempShuffled.forEach((name, i) => temp[i % teamCount].push(name));
      setTeams(temp);
      if (count >= 10) {
        clearInterval(interval);
        setTeams(result);
        setAnimating(false);
      }
    }, 100);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'linear-gradient(160deg, #f0fafa 0%, #f3f2f1 60%)', fontFamily: MS_FONT, color: '#323130' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 200, height: '48px', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #edebe9', display: 'flex', alignItems: 'center', padding: '0 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, cursor: 'pointer' }} onClick={() => router.push('/fun')}>
          <svg width="14" height="14" viewBox="0 0 23 23" fill="none" style={{ flexShrink: 0 }}>
            <rect x="0" y="0" width="10" height="10" fill="#f25022"/><rect x="12" y="0" width="10" height="10" fill="#7fba00"/>
            <rect x="0" y="12" width="10" height="10" fill="#00a4ef"/><rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
          </svg>
          <span style={{ color: '#0078D4', fontSize: '0.98rem', fontWeight: 600 }}>FuN fUn</span>
          <span style={{ color: '#a19f9d', fontSize: '0.98rem', margin: '0 0.2rem' }}>›</span>
          <span style={{ color: '#323130', fontSize: '0.98rem', fontWeight: 600 }}>팀 랜덤 배정기</span>
        </div>
        {names.length > 0 && (
          <span style={{
            fontSize: '0.86rem', color: '#008272', fontWeight: 700,
            background: '#e0f7f5', border: '1px solid #80d4cc',
            borderRadius: '20px', padding: '0.2rem 0.75rem', marginRight: '0.75rem',
          }}>👥 {names.length}명</span>
        )}
        <button onClick={() => router.push('/')} style={{ padding: '0.35rem 0.85rem', background: 'transparent', border: '1px solid #8a8886', borderRadius: '6px', cursor: 'pointer', color: '#323130', fontSize: '0.94rem' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f2f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>메인 채팅</button>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #003344 0%, #008272 100%)', padding: '1.1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.2rem', filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.35))' }}>👥</div>
        <div>
          <p style={{ color: '#99e6de', fontSize: '0.74rem', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 0.15rem', fontWeight: 600 }}>랜덤 · 팀배정</p>
          <h1 style={{ color: 'white', fontSize: '1.32rem', fontWeight: 700, margin: '0 0 0.1rem', letterSpacing: '-0.3px' }}>팀 랜덤 배정기</h1>
          <p style={{ color: '#b3f0ea', margin: 0, fontSize: '0.86rem' }}>눈치 없이 공정하게 팀을 나눠드립니다!</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '1.75rem 2rem 3rem', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* ── 입력 카드 ── */}
        <div style={{
          background: 'white',
          border: '1px solid #e0dedd',
          borderRadius: '20px',
          boxShadow: '0 10px 36px rgba(0,0,0,0.09), 0 3px 10px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
          padding: '1.75rem',
          overflow: 'hidden',
        }}>
          {/* 카드 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '4px', height: '22px', background: 'linear-gradient(180deg, #006b5e 0%, #008272 100%)', borderRadius: '2px' }} />
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1b1b1b' }}>참가자 입력</span>
            <span style={{ fontSize: '0.84rem', color: '#a19f9d', fontWeight: 400 }}>한 줄에 한 명</span>
          </div>

          {/* textarea */}
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={'홍길동\n이순신\n강감찬\n세종대왕\n유관순\n안중근'}
            rows={7}
            style={{
              width: '100%', padding: '0.85rem 1rem',
              border: '1.5px solid #d0cece', borderRadius: '12px',
              fontSize: '1.04rem', resize: 'vertical', boxSizing: 'border-box',
              fontFamily: MS_FONT, lineHeight: 1.7, outline: 'none',
              transition: 'all 0.12s', color: '#1b1b1b',
              background: '#fafaf9',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.04)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#008272'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,130,114,0.10), inset 0 2px 6px rgba(0,0,0,0.04)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#d0cece'; e.currentTarget.style.boxShadow = 'inset 0 2px 6px rgba(0,0,0,0.04)'; }}
          />
          <div style={{ fontSize: '0.84rem', color: names.length > 0 ? '#008272' : '#a19f9d', fontWeight: 600, marginTop: '0.4rem' }}>
            {names.length > 0 ? `✓ ${names.length}명 입력됨` : '이름을 입력하세요'}
          </div>

          {/* 팀 수 선택 */}
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1b1b1b', marginBottom: '0.6rem' }}>팀 수 선택</div>
            <div style={{ display: 'flex', gap: '0.45rem' }}>
              {[2, 3, 4, 5, 6].map(n => {
                const active = teamCount === n;
                return (
                  <button key={n} onClick={() => setTeamCount(n)} style={{
                    flex: 1, padding: '0.55rem 0.25rem',
                    background: active ? 'linear-gradient(135deg, #006b5e 0%, #008272 100%)' : 'transparent',
                    color: active ? 'white' : '#605e5c',
                    border: `1.5px solid ${active ? '#008272' : '#d0cece'}`,
                    borderRadius: '10px', cursor: 'pointer',
                    fontWeight: active ? 700 : 500, fontSize: '0.96rem',
                    transition: 'all 0.15s',
                    boxShadow: active ? '0 4px 12px rgba(0,130,114,0.30)' : '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#e0f7f5'; e.currentTarget.style.borderColor = '#008272'; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#d0cece'; } }}
                  >{n}팀</button>
                );
              })}
            </div>
          </div>

          {/* 배정 버튼 */}
          <button
            onClick={makeTeams}
            disabled={!canAssign || animating}
            style={{
              width: '100%', marginTop: '1.25rem', padding: '0.8rem',
              background: !canAssign
                ? 'linear-gradient(135deg, #e0dedd 0%, #f3f2f1 100%)'
                : 'linear-gradient(135deg, #006b5e 0%, #008272 50%, #00a090 100%)',
              color: !canAssign ? '#a19f9d' : 'white',
              border: 'none', borderRadius: '12px',
              fontSize: '1.06rem', fontWeight: 700,
              cursor: !canAssign ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              boxShadow: !canAssign ? 'none' : '0 6px 20px rgba(0,130,114,0.40), 0 2px 6px rgba(0,0,0,0.10)',
              letterSpacing: '0.2px',
            }}
            onMouseEnter={e => { if (canAssign && !animating) { e.currentTarget.style.background = 'linear-gradient(135deg, #005a4e 0%, #006b5e 50%, #008272 100%)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
            onMouseLeave={e => { if (canAssign && !animating) { e.currentTarget.style.background = 'linear-gradient(135deg, #006b5e 0%, #008272 50%, #00a090 100%)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
          >
            {animating ? '🎲 배정 중...' : !canAssign ? `최소 ${teamCount}명이 필요합니다` : '🎯 팀 배정하기!'}
          </button>
        </div>

        {/* ── 결과 팀 카드들 ── */}
        {teams.length > 0 && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: getGridCols(teamCount),
              gap: '1rem',
            }}>
              {teams.map((team, ti) => {
                const color = TEAM_COLORS[ti];
                return (
                  <div key={ti} style={{
                    background: 'white',
                    border: `1.5px solid ${color}40`,
                    borderTop: `4px solid ${color}`,
                    borderRadius: '0 0 16px 16px',
                    boxShadow: `0 8px 28px ${color}18, 0 2px 8px rgba(0,0,0,0.06)`,
                    padding: '1.1rem',
                    transition: 'transform 0.15s',
                  }}>
                    {/* 팀 헤더 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.85rem' }}>
                      <div style={{
                        width: '32px', height: '32px',
                        background: `linear-gradient(135deg, ${color}cc, ${color})`,
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 900, fontSize: '0.9rem',
                        boxShadow: `0 3px 10px ${color}50`,
                        flexShrink: 0,
                      }}>{ti + 1}</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.02rem', color }}>{ti + 1}팀</div>
                        <div style={{ fontSize: '0.78rem', color: '#a19f9d', fontWeight: 600 }}>{team.length}명</div>
                      </div>
                    </div>

                    {/* 멤버 목록 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {team.map((name, ni) => (
                        <div key={ni} style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.4rem 0.7rem',
                          background: `${color}0c`,
                          border: `1px solid ${color}25`,
                          borderRadius: '8px',
                          fontSize: '0.96rem', color: '#1b1b1b',
                          transition: 'background 0.1s',
                        }}>
                          <span style={{
                            fontSize: '0.76rem', fontWeight: 800, color,
                            minWidth: '16px', textAlign: 'right',
                          }}>{ni + 1}</span>
                          <span style={{ width: '1px', height: '12px', background: `${color}40`, flexShrink: 0 }} />
                          <span style={{ fontWeight: 500 }}>{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 다시 배정 버튼 */}
            {!animating && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={makeTeams}
                  style={{
                    padding: '0.6rem 2rem',
                    background: 'transparent', color: '#008272',
                    border: '2px solid #008272', borderRadius: '50px',
                    cursor: 'pointer', fontSize: '0.98rem', fontWeight: 700,
                    transition: 'all 0.15s',
                    boxShadow: '0 2px 8px rgba(0,130,114,0.15)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#008272'; e.currentTarget.style.color = 'white'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,130,114,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#008272'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,130,114,0.15)'; }}
                >🔀 다시 배정하기</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
