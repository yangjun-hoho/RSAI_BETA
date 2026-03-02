'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/* ── 해시 함수 ── */
function hashNum(seed: number, min: number, max: number) {
  let h = seed;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return min + (Math.abs(h) % (max - min + 1));
}

const DAILY_QUOTES = [
  '오늘 결재는 한 번에 통과됩니다. 믿어요.',
  '먼저 인사하는 사람이 오늘의 주인공.',
  '급할수록 돌아가라 — 오늘의 보고서에 딱 맞는 말.',
  '칭찬 한 마디가 팀원의 하루를 바꿉니다.',
  '지금 이 순간, 당신은 충분히 잘하고 있어요.',
  '오늘 하루도 기록으로 남기면 내일의 무기가 됩니다.',
  '민원인도 한때는 평범한 시민이었습니다. 오늘은 웃으며 대하세요.',
  '작은 업무도 정성껏 하면 눈에 띄는 법.',
  '오늘 퇴근 후 맛있는 것 하나 먹어요. 당신이 오늘 수고했으니까.',
  '어제의 나보다 오늘의 내가 조금 더 나아졌다면 충분합니다.',
  '어려운 민원일수록 천천히, 또렷하게.',
  '오늘의 실수는 내일의 매뉴얼이 됩니다.',
];

const LUCKY_COLORS   = ['빨강 🔴', '주황 🟠', '노랑 🟡', '초록 🟢', '파랑 🔵', '보라 🟣', '분홍 🩷', '흰색 ⬜', '하늘색 🩵', '금색 🟡'];
const LUCKY_FOODS    = ['아메리카노 ☕', '국밥 🍲', '초밥 🍣', '파스타 🍝', '김치찌개 🥘', '비빔밥 🍚', '냉면 🍜', '돈까스 🍱', '샌드위치 🥪', '삼겹살 🥩'];
const LUCKY_DIRS     = ['동쪽 →', '서쪽 ←', '남쪽 ↓', '북쪽 ↑', '동남쪽 ↘', '북서쪽 ↖'];
const LUCKY_NUMBERS  = [3, 7, 9, 11, 13, 17, 21, 28, 33, 42, 47, 55, 66, 77, 88];

const WORK_MSGS = [
  { msg: '오늘은 민원이 나를 비껴가는 날. 평화롭고 순조로운 업무를 기대하세요.', stars: 5 },
  { msg: '보고서 한 번에 통과! 상사의 칭찬이 들려올 것 같습니다.', stars: 4 },
  { msg: '오전은 순조롭지만 오후에 갑작스러운 업무가 생길 수 있어요.', stars: 3 },
  { msg: '오늘 결재가 3번 반려될 수도... 꼼꼼히 확인 후 제출하세요!', stars: 2 },
  { msg: '악성 민원의 기운이 감지됩니다. 심호흡하고 대응하세요.', stars: 1 },
  { msg: '아이디어가 넘쳐나는 날! 창의적인 기획을 시도해보세요.', stars: 5 },
  { msg: '산더미 같은 업무... 하나씩 처리하면 반드시 끝납니다.', stars: 2 },
  { msg: '오늘은 모든 일이 착착 맞아떨어지는 날입니다!', stars: 5 },
];

const PEOPLE_MSGS = [
  { msg: '팀원과의 관계가 원만한 날. 소소한 칭찬 한 마디가 팀 분위기를 바꿉니다.', stars: 5 },
  { msg: '상사의 기분이 좋을 것 같아요. 보고서 제출하기 딱 좋은 날!', stars: 4 },
  { msg: '동료의 고민을 들어줄 기회가 생길 수 있어요.', stars: 3 },
  { msg: '오늘은 뭔가 말이 꼬이기 쉬운 날. 신중하게 발언하세요.', stars: 2 },
  { msg: '팀 내 갈등의 기운이... 중재자 역할이 필요할 수도 있어요.', stars: 2 },
  { msg: '새로운 인연이 생길 수도 있는 날. 먼저 인사해보세요!', stars: 4 },
  { msg: '상사가 깐깐한 하루. 꼼꼼하게 준비해 당당하게 보고하세요.', stars: 3 },
  { msg: '팀워크가 빛나는 날! 협업 프로젝트를 시작하기 좋아요.', stars: 5 },
];

const LUNCH_MSGS = [
  { msg: '오늘의 점심은 한식이 좋습니다. 따뜻한 국밥으로 에너지 충전!', stars: 5 },
  { msg: '중식이 최고의 선택! 짬뽕의 기운이 업무 스트레스를 날려줍니다.', stars: 4 },
  { msg: '가볍게 분식으로! 떡볶이가 기분을 업시켜 줄 것 같아요.', stars: 4 },
  { msg: '일식의 날. 정갈한 도시락이나 초밥으로 기분 전환!', stars: 4 },
  { msg: '오늘은 혼밥이 최고. 조용히 혼자만의 점심 시간을 가져보세요.', stars: 3 },
  { msg: '팀원들과 함께 먹으면 배가 더 맛있는 날!', stars: 5 },
  { msg: '편의점 도시락도 나쁘지 않아요. 간단하게 해결하고 산책을!', stars: 3 },
  { msg: '오늘은 뭘 먹어도 맛있는 날! 평소에 못 간 맛집에 도전해봐요.', stars: 5 },
];

const LEAVE_MSGS = [
  { msg: '오늘은 칼퇴의 기운이 강합니다! 이미 짐은 싸두세요.', stars: 5 },
  { msg: '정시 퇴근 가능성 높음. 퇴근 후 계획을 세워두세요!', stars: 4 },
  { msg: '오후 늦게 갑자기 일이 생길 수 있어요. 마음의 준비를...', stars: 2 },
  { msg: '야근의 기운이 느껴집니다. 오전에 최대한 업무를 끝내두세요!', stars: 1 },
  { msg: '미리 업무를 처리해두면 정시 퇴근이 가능해요.', stars: 3 },
  { msg: '상사의 퇴근이 빠를 것 같은 날. 따라서 나올 기회!', stars: 5 },
  { msg: '오늘은 자원해서 일찍 퇴근하는 행운의 날?', stars: 4 },
  { msg: '퇴근 후 맛있는 저녁과 함께 피로를 풀어보세요!', stars: 5 },
];

const MORNING_MSGS = [
  '출근하자마자 커피부터! 오전 집중력이 최고조입니다.',
  '오전 업무를 빠르게 처리해두면 오후가 편해집니다.',
  '오늘 오전은 보고서 작업에 최적의 시간대입니다.',
  '아침부터 민원 대응이 있을 수 있어요. 마음의 준비를!',
  '오전에는 중요 결재를 먼저 올리는 것이 유리합니다.',
  '오전 회의가 순조롭게 진행될 것 같습니다.',
  '오전에는 조용히 집중할 수 있는 환경이 만들어질 거예요.',
  '오전 중 상사에게 좋은 소식을 들을 수도 있습니다.',
];

const AFTERNOON_MSGS = [
  '오후 2~3시가 가장 집중력이 높은 시간. 핵심 업무를 배치하세요.',
  '점심 후 나른함은 10분 낮잠으로 극복! 오후는 빠르게 지나갑니다.',
  '오후에 예상치 못한 업무가 추가될 수 있어요.',
  '오후 미팅에서 당신의 의견이 주목받을 수 있습니다.',
  '오후부터 업무 속도가 빨라집니다. 마감을 앞당겨 봐요.',
  '오후에는 동료와의 협력이 중요한 시간입니다.',
  '오후 내내 전화가 많을 수도 있어요. 인내심을 발휘하세요!',
  '오후 업무는 메모를 꼼꼼히 남겨두는 것이 좋습니다.',
];

const EVENING_MSGS = [
  '오늘 퇴근 후 맛있는 것 하나 드세요. 충분히 수고했습니다!',
  '퇴근 후 가벼운 운동이 스트레스 해소에 도움이 됩니다.',
  '오늘 저녁은 일찍 쉬는 것이 최선. 내일을 위한 에너지 충전!',
  '퇴근 후 좋아하는 취미로 재충전해 보세요.',
  '저녁 약속이 있다면 오늘은 좋은 대화가 오갈 것 같습니다.',
  '퇴근 후 업무 생각은 잠시 내려놓고 온전히 쉬어보세요.',
  '저녁 시간에 내일 업무를 간단히 정리해두면 마음이 편해집니다.',
  '오늘 저녁은 가족이나 친구와 연락해보는 건 어떨까요?',
];

const CAUTIONS = [
  { icon: '📝', msg: '서류 제출 전 반드시 재확인하세요. 오타 한 글자가 결재를 반려시킵니다.' },
  { icon: '🗣️', msg: '오늘은 말실수 조심! 가급적 신중하게 발언하는 것이 좋습니다.' },
  { icon: '📱', msg: '중요한 연락은 구두보다 문서로 남겨두세요. 나중에 증거가 됩니다.' },
  { icon: '⏰', msg: '마감 기한을 한 번 더 확인하세요. 놓친 마감은 없는지 점검!' },
  { icon: '🤐', msg: '팀 내 민감한 주제는 오늘 피하는 것이 상책입니다.' },
  { icon: '💾', msg: '작업 중인 파일을 자주 저장하세요. 오늘은 PC 오류가 생길 수 있습니다.' },
  { icon: '☕', msg: '카페인에 너무 의존하지 마세요. 오늘은 물을 충분히 마셔야 집중력이 유지됩니다.' },
  { icon: '🏃', msg: '급하게 서두르다 실수할 수 있어요. 오늘은 천천히, 정확하게!' },
];

function getFortune(date: Date) {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return {
    work:      WORK_MSGS[hashNum(seed * 7,  0, WORK_MSGS.length - 1)],
    people:    PEOPLE_MSGS[hashNum(seed * 13, 0, PEOPLE_MSGS.length - 1)],
    lunch:     LUNCH_MSGS[hashNum(seed * 19, 0, LUNCH_MSGS.length - 1)],
    leave:     LEAVE_MSGS[hashNum(seed * 31, 0, LEAVE_MSGS.length - 1)],
    quote:     DAILY_QUOTES[hashNum(seed * 3, 0, DAILY_QUOTES.length - 1)],
    luckyColor:  LUCKY_COLORS[hashNum(seed * 41, 0, LUCKY_COLORS.length - 1)],
    luckyFood:   LUCKY_FOODS[hashNum(seed * 47, 0, LUCKY_FOODS.length - 1)],
    luckyDir:    LUCKY_DIRS[hashNum(seed * 53, 0, LUCKY_DIRS.length - 1)],
    luckyNum:    LUCKY_NUMBERS[hashNum(seed * 59, 0, LUCKY_NUMBERS.length - 1)],
    morning:   MORNING_MSGS[hashNum(seed * 61, 0, MORNING_MSGS.length - 1)],
    afternoon: AFTERNOON_MSGS[hashNum(seed * 67, 0, AFTERNOON_MSGS.length - 1)],
    evening:   EVENING_MSGS[hashNum(seed * 71, 0, EVENING_MSGS.length - 1)],
    caution:   CAUTIONS[hashNum(seed * 79, 0, CAUTIONS.length - 1)],
  };
}

function Stars({ n, size = '0.95rem' }: { n: number; size?: string }) {
  return (
    <span style={{ letterSpacing: '1px', fontSize: size }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < n ? '#ca5010' : '#edebe9' }}>★</span>
      ))}
    </span>
  );
}

const MS_FONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif';

export default function FortunePage() {
  const router = useRouter();
  const [date] = useState(new Date());
  const f = getFortune(date);

  const dateStr = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayStr = days[date.getDay()] + '요일';

  useEffect(() => { document.title = '오늘의 운세 | FuN fUn'; }, []);

  const cards = [
    { emoji: '💼', label: '업무운',     data: f.work,   color: '#0078D4' },
    { emoji: '🤝', label: '대인관계운', data: f.people, color: '#107c10' },
    { emoji: '🍱', label: '점심운',     data: f.lunch,  color: '#ca5010' },
    { emoji: '🏠', label: '퇴근운',     data: f.leave,  color: '#744da9' },
  ];

  const avgStars = cards.reduce((s, c) => s + c.data.stars, 0) / cards.length;
  const overallLabel = avgStars >= 4.5 ? '최고의 하루!' : avgStars >= 3.5 ? '순조로운 하루' : avgStars >= 2.5 ? '평범한 하루' : '조심스러운 하루';

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
          <span style={{ color: '#323130', fontSize: '0.98rem', fontWeight: 600 }}>오늘의 운세</span>
        </div>
        <button onClick={() => router.push('/')} style={{ padding: '0.35rem 0.85rem', background: 'transparent', border: '1px solid #8a8886', borderRadius: '2px', cursor: 'pointer', color: '#323130', fontSize: '0.94rem' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f2f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>메인 채팅</button>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #2a0a5e 0%, #744da9 100%)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.1rem', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>🔮</div>
        <div>
          <p style={{ color: '#d8b4fe', fontSize: '0.74rem', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 0.15rem', fontWeight: 600 }}>운세 · 오늘의운세</p>
          <h1 style={{ color: 'white', fontSize: '1.32rem', fontWeight: 700, margin: '0 0 0.1rem', letterSpacing: '-0.3px' }}>오늘의 업무 운세</h1>
          <p style={{ color: '#c4b5fd', margin: 0, fontSize: '0.86rem' }}>{dateStr} {dayStr}</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '1.5rem 2rem 3rem', maxWidth: '560px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1px' }}>

        {/* 오늘의 한 마디 */}
        <div style={{ background: '#2a0a5e', border: '1px solid #744da9', padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '2px', color: '#c4b5fd', marginBottom: '0.5rem', textTransform: 'uppercase' }}>🔮 오늘의 한 마디</div>
          <p style={{ margin: 0, fontSize: '1.14rem', fontWeight: 600, lineHeight: 1.7, color: 'white' }}>
            &ldquo;{f.quote}&rdquo;
          </p>
        </div>

        {/* 종합 운세 */}
        <div style={{ background: 'white', border: '1px solid #edebe9', padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '0.25rem' }}>🔮</div>
            <Stars n={Math.round(avgStars)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.78rem', color: '#605e5c', fontWeight: 600, marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '1px' }}>종합 운세</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#323130', marginBottom: '0.4rem' }}>{overallLabel}</div>
            <div style={{ height: '4px', background: '#f3f2f1', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(avgStars / 5) * 100}%`, background: '#744da9' }} />
            </div>
            <div style={{ fontSize: '0.82rem', color: '#605e5c', marginTop: '0.3rem' }}>{avgStars.toFixed(1)} / 5.0</div>
          </div>
        </div>

        {/* 행운 요소 */}
        <div style={{ background: 'white', border: '1px solid #edebe9', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#323130', marginBottom: '0.75rem' }}>🍀 오늘의 행운 요소</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1px', background: '#edebe9', border: '1px solid #edebe9' }}>
            {[
              { label: '행운 색', value: f.luckyColor, color: '#744da9' },
              { label: '행운 숫자', value: `${f.luckyNum}`, color: '#0078D4' },
              { label: '행운 음식', value: f.luckyFood, color: '#107c10' },
              { label: '행운 방향', value: f.luckyDir, color: '#ca5010' },
            ].map(item => (
              <div key={item.label} style={{ background: 'white', padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#605e5c', fontWeight: 600, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: item.color, lineHeight: 1.4 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 4가지 운세 카드 (2×2 그리드) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: '#edebe9', border: '1px solid #edebe9' }}>
          {cards.map(c => (
            <div key={c.label} style={{ background: 'white', padding: '1rem 1.15rem', borderTop: `3px solid ${c.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{c.emoji}</span>
                  <span style={{ fontWeight: 700, color: '#323130', fontSize: '0.98rem' }}>{c.label}</span>
                </div>
                <Stars n={c.data.stars} size="0.72rem" />
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#605e5c', lineHeight: 1.6 }}>{c.data.msg}</p>
            </div>
          ))}
        </div>

        {/* 시간대별 운세 */}
        <div style={{ background: 'white', border: '1px solid #edebe9', padding: '1.1rem 1.25rem' }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#323130', marginBottom: '1rem' }}>⏱️ 시간대별 운세</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { time: '오전', sub: '09:00~12:00', icon: '🌅', msg: f.morning,   color: '#ca5010' },
              { time: '오후', sub: '12:00~18:00', icon: '☀️', msg: f.afternoon, color: '#0078D4' },
              { time: '퇴근 후', sub: '18:00~',  icon: '🌙', msg: f.evening,   color: '#744da9' },
            ].map((item, i, arr) => (
              <div key={item.time} style={{ display: 'flex', gap: '0.85rem', paddingBottom: i < arr.length - 1 ? '0.85rem' : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '28px', flexShrink: 0 }}>
                  <div style={{
                    width: '28px', height: '28px',
                    border: `2px solid ${item.color}`,
                    borderTop: `3px solid ${item.color}`,
                    background: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.02rem', flexShrink: 0,
                  }}>{item.icon}</div>
                  {i < arr.length - 1 && (
                    <div style={{ width: '2px', flex: 1, minHeight: '16px', background: '#edebe9', margin: '4px 0' }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingTop: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.98rem', color: item.color }}>{item.time}</span>
                    <span style={{ fontSize: '0.78rem', color: '#a19f9d' }}>{item.sub}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.94rem', color: '#605e5c', lineHeight: 1.6 }}>{item.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 주의 사항 */}
        <div style={{ background: 'white', border: '1px solid #edebe9', borderLeft: '4px solid #ca5010', padding: '1rem 1.25rem', display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '1.56rem', flexShrink: 0 }}>{f.caution.icon}</div>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#323130', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '1px' }}>⚠️ 오늘의 주의 사항</div>
            <p style={{ margin: 0, fontSize: '0.96rem', color: '#605e5c', lineHeight: 1.65 }}>{f.caution.msg}</p>
          </div>
        </div>

        {/* 푸터 */}
        <div style={{ background: 'white', border: '1px solid #edebe9', padding: '0.75rem 1.25rem', textAlign: 'center', color: '#a19f9d', fontSize: '0.84rem' }}>
          🔮 오늘의 운세는 날짜를 기반으로 생성됩니다. 재미로만 즐겨주세요!
        </div>
      </div>
    </div>
  );
}
