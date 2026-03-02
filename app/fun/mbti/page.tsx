'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Dim = 'EI' | 'SN' | 'TF' | 'JP';
type ScaleVal = 1 | 2 | 3 | 4 | 5;

interface Question { dim: Dim; q: string; a: string; b: string; }

const QUESTIONS: Question[] = [
  // E vs I (A=E, B=I)
  { dim: 'EI', q: '사람들과 함께 시간을 보내면', a: '에너지가 충전되고 활기차진다', b: '에너지가 소모되어 피로해진다' },
  { dim: 'EI', q: '처음 만나는 자리에서 나는', a: '먼저 적극적으로 다가가 대화를 시작한다', b: '익숙한 사람을 찾거나 조용히 상황을 살핀다' },
  { dim: 'EI', q: '아이디어가 생겼을 때 나는', a: '즉시 다른 사람들과 공유하며 발전시킨다', b: '혼자 충분히 생각한 후 정리해서 말한다' },
  { dim: 'EI', q: '스트레스 해소 방법으로 더 끌리는 것은', a: '친구나 동료와 어울리며 기분 전환하기', b: '혼자만의 조용한 공간에서 재충전하기' },
  { dim: 'EI', q: '나의 인간관계 방식은', a: '다양한 사람들과 폭넓게 어울리는 것을 즐긴다', b: '소수의 친밀한 관계를 깊이 유지하는 편이다' },

  // S vs N (A=S, B=N)
  { dim: 'SN', q: '새로운 정보를 접할 때 집중하는 부분은', a: '구체적인 사실과 검증된 데이터', b: '전체적인 패턴과 숨겨진 가능성' },
  { dim: 'SN', q: '문제 해결 시 선호하는 접근 방식은', a: '과거에 검증된 방법을 우선 적용한다', b: '새로운 창의적 해결책을 먼저 모색한다' },
  { dim: 'SN', q: '미래에 대해 생각할 때 나는', a: '현실적이고 달성 가능한 목표 중심으로 생각한다', b: '다양한 가능성을 상상하며 큰 그림을 그린다' },
  { dim: 'SN', q: '업무 지시를 받을 때 더 궁금한 것은', a: '어떻게(HOW) — 구체적 절차와 단계별 방법', b: '왜(WHY) — 전체 목적과 프로젝트의 맥락' },
  { dim: 'SN', q: '나는 주로 어떤 유형에 더 가까운가', a: '현실적이고 실용적인 것을 중시하는 현재형', b: '미래 가능성과 변화를 추구하는 혁신형' },

  // T vs F (A=T, B=F)
  { dim: 'TF', q: '중요한 결정을 내릴 때 주로 의존하는 것은', a: '객관적 분석과 논리적 근거', b: '개인 가치관과 관련자들의 감정' },
  { dim: 'TF', q: '누군가 고민을 털어놓으면 나는', a: '원인을 분석하고 실질적인 해결책을 제시한다', b: '먼저 공감하고 감정을 충분히 받아준다' },
  { dim: 'TF', q: '의견 충돌이 생겼을 때 나는', a: '사실과 논리로 상대를 설득하려 한다', b: '관계를 해치지 않는 방향을 먼저 고려한다' },
  { dim: 'TF', q: '피드백을 줄 때 나는', a: '사실 그대로 직접적으로 전달하는 편이다', b: '상대의 감정을 고려하며 부드럽게 전달한다' },
  { dim: 'TF', q: '팀원 평가 시 더 중요하게 보는 기준은', a: '성과와 결과, 객관적 능력과 역량', b: '노력과 과정, 팀 기여도와 인성' },

  // J vs P (A=J, B=P)
  { dim: 'JP', q: '업무를 진행할 때 나는', a: '세부 일정을 계획하고 단계별로 체계적으로 한다', b: '큰 방향만 잡고 상황에 따라 유연하게 조율한다' },
  { dim: 'JP', q: '마감 기한이 있을 때 나는', a: '마감 전 여유 있게 미리 완료해 둔다', b: '마감 직전 집중력이 극대화되며 완성한다' },
  { dim: 'JP', q: '갑작스러운 계획 변경이 생기면', a: '불편하고 빨리 새 계획을 세워야 안심된다', b: '새로운 가능성으로 보고 유연하게 적응한다' },
  { dim: 'JP', q: '일상의 루틴에 대해 나는', a: '정해진 루틴이 있어야 안정감을 느낀다', b: '매번 다른 방식으로 하는 것이 더 즐겁다' },
  { dim: 'JP', q: '결정을 내릴 때 나는', a: '빠르게 결론 짓고 실행에 옮기고 싶다', b: '더 많은 정보를 수집하며 계속 열어두고 싶다' },
];

// 1→-2(A극), 2→-1(A), 3→0(중립), 4→+1(B), 5→+2(B극)
const SCORE_MAP: Record<ScaleVal, number> = { 1: -2, 2: -1, 3: 0, 4: 1, 5: 2 };

const DIM_META = {
  EI: { a: 'E', b: 'I', aFull: '외향 (E)', bFull: '내향 (I)', color: '#0078D4' },
  SN: { a: 'S', b: 'N', aFull: '감각 (S)', bFull: '직관 (N)', color: '#107c10' },
  TF: { a: 'T', b: 'F', aFull: '사고 (T)', bFull: '감정 (F)', color: '#ca5010' },
  JP: { a: 'J', b: 'P', aFull: '판단 (J)', bFull: '인식 (P)', color: '#d13438' },
};

interface TypeResult {
  emoji: string;
  name: string;
  en: string;
  core: string;
  strengths: string[];
  growth: string;
  work: string;
}

const RESULTS: Record<string, TypeResult> = {
  ISTJ: { emoji: '📋', name: '청렴결백한 원칙주의자', en: 'The Inspector',
    core: '사실에 기반한 정보를 신뢰하며 맡은 책임을 철저히 완수합니다. 체계적이고 꼼꼼하며 규칙과 절차를 중시하는 신뢰할 수 있는 유형입니다.',
    strengths: ['탁월한 책임감과 높은 신뢰성', '체계적 계획 수립과 완벽한 실행력', '세부 사항까지 놓치지 않는 집중력'],
    growth: '변화에 대한 유연성을 기르고, 타인의 감정적 필요에 조금 더 공감하는 연습이 균형 잡힌 성장에 도움이 됩니다.',
    work: '명확한 절차와 기준이 있는 환경에서 최고의 성과를 발휘합니다. 장기적으로 안정된 업무를 선호하며 독립적으로 일할 때 효율이 극대화됩니다.' },

  ISFJ: { emoji: '🛡️', name: '용감한 수호자', en: 'The Protector',
    core: '다른 사람들을 지원하고 보살피는 것에서 깊은 보람을 느낍니다. 헌신적이고 인내심이 강하며, 팀의 분위기와 구성원의 필요를 세심하게 챙깁니다.',
    strengths: ['강한 공감 능력과 진심 어린 배려심', '신뢰할 수 있는 일관된 성실함', '팀 화합을 이끄는 섬세한 중재 능력'],
    growth: '자신의 필요와 의견을 보다 적극적으로 표현하고, 때로는 경계를 설정하며 자신을 먼저 돌보는 용기가 필요합니다.',
    work: '다른 사람을 지원하는 역할에서 가장 빛납니다. 체계적인 환경과 명확한 기대치가 있을 때 안정적으로 높은 성과를 냅니다.' },

  INFJ: { emoji: '🌱', name: '선의의 옹호자', en: 'The Counselor',
    core: '깊은 통찰력으로 사람들을 이해하며 장기적 비전을 추구합니다. 내면 세계가 풍부하고, 의미 있는 변화를 위해 조용하지만 강하게 헌신합니다.',
    strengths: ['탁월한 직관력과 깊은 통찰력', '사람들에 대한 진정한 이해와 공감', '가치 중심의 강한 헌신과 목표 의식'],
    growth: '완벽주의로 인한 번아웃을 주의하고, 현실적 한계를 인정하며 자신을 돌보는 시간을 의도적으로 갖는 것이 중요합니다.',
    work: '가치 있는 사명과 연결된 업무에서 최고의 동기부여를 받습니다. 충분한 자율성과 사색할 시간이 주어질 때 탁월한 창의적 성과를 냅니다.' },

  INTJ: { emoji: '♟️', name: '용의주도한 전략가', en: 'The Mastermind',
    core: '독립적으로 사고하며 장기 목표를 향해 전략적으로 움직입니다. 비효율을 참지 못하며 시스템을 개선하는 탁월한 역량을 가지고 있습니다.',
    strengths: ['전략적 사고와 장기적 계획 수립 능력', '복잡한 문제를 단순화하는 분석력', '높은 자기주도성과 목표 지향성'],
    growth: '타인의 감정과 의견에 더 많은 주의를 기울이고, 아이디어를 공유하며 협력하는 과정이 더 큰 시너지를 만들 수 있습니다.',
    work: '독립적으로 큰 그림을 그리는 역할에서 두각을 나타냅니다. 불필요한 규정 없이 자율적으로 일하며 결과로 평가받는 환경을 선호합니다.' },

  ISTP: { emoji: '🔧', name: '만능 재주꾼', en: 'The Craftsman',
    core: '실용적이고 논리적으로 사물의 작동 원리를 파악합니다. 현장에서 빠르게 문제를 분석하고 효율적인 해결책을 찾아내는 뛰어난 능력을 가집니다.',
    strengths: ['탁월한 실용적 문제 해결 능력', '위기 상황에서의 침착함과 빠른 판단력', '다양한 도구와 기술에 대한 뛰어난 이해력'],
    growth: '장기 계획을 수립하는 연습과 팀원들과의 적극적인 소통 능력을 기르는 것이 커리어 발전에 큰 도움이 됩니다.',
    work: '복잡한 문제를 분석하고 실질적 해결책을 찾는 업무에서 빛납니다. 지나친 규정보다 실질적 결과를 추구하는 자율적 환경을 선호합니다.' },

  ISFP: { emoji: '🎨', name: '호기심 많은 예술가', en: 'The Composer',
    core: '온화하고 열린 마음으로 사람들을 받아들이며 현재 순간에 충실합니다. 섬세한 감수성으로 조화로운 환경을 추구하고 타인을 깊이 배려합니다.',
    strengths: ['예외적인 공감 능력과 섬세한 감수성', '팀 분위기 조성과 갈등 완화 능력', '현재에 충실한 유연한 적응력'],
    growth: '자신의 의견을 좀 더 적극적으로 표현하고, 장기 계획 수립과 자기 주장 능력을 키우는 것이 성장에 도움이 됩니다.',
    work: '창의적이고 개인의 가치를 인정받는 환경에서 빛납니다. 지나치게 경쟁적이거나 경직된 구조보다 유연한 업무 방식을 선호합니다.' },

  INFP: { emoji: '🌟', name: '열정적인 중재자', en: 'The Healer',
    core: '강한 내면의 가치관을 바탕으로 이상을 추구합니다. 타인의 잠재력을 믿고 진정성 있는 방식으로 사람과 세상에 기여하고자 합니다.',
    strengths: ['깊은 공감 능력과 진정성 있는 배려', '풍부한 창의성과 독창적 표현력', '의미 있는 변화를 위한 지속적 헌신'],
    growth: '현실적인 계획 수립과 실행력을 기르고, 비판을 개인적으로 받아들이지 않는 회복탄력성을 키우는 것이 중요합니다.',
    work: '의미 있는 사명과 연결된 업무에서 최대의 동기부여를 받습니다. 자율성이 보장되고 가치관과 일이 일치할 때 탁월한 성과를 냅니다.' },

  INTP: { emoji: '🔬', name: '논리적인 사색가', en: 'The Architect',
    core: '분석적이고 객관적으로 세상을 이해하려 합니다. 복잡한 이론과 아이디어를 탐구하는 것을 즐기며 독창적인 해결책을 제시합니다.',
    strengths: ['탁월한 분석 능력과 논리적 사고력', '복잡한 개념을 단순화하는 통찰력', '객관적이고 편견 없는 공정한 판단력'],
    growth: '이론을 실천으로 옮기는 실행력과 타인과의 정서적 연결을 강화하는 것이 균형 잡힌 성장으로 이어집니다.',
    work: '독립적으로 복잡한 문제를 분석하는 환경에서 최고의 성과를 냅니다. 반복적 업무보다 지적 자극이 있는 도전적 과제를 선호합니다.' },

  ESTP: { emoji: '⚡', name: '활동적인 모험가', en: 'The Dynamo',
    core: '현실적이고 행동 지향적이며 에너지가 넘칩니다. 즉각적인 결과를 위해 빠르게 결정하고 실행하는 것을 즐기며 현장에서 강점을 발휘합니다.',
    strengths: ['빠른 상황 파악과 즉각적 대응 능력', '역동적 에너지로 팀에 활력을 불어넣는 능력', '뛰어난 설득력과 폭넓은 사교성'],
    growth: '장기적 결과를 고려한 신중한 계획 수립과, 충동적 결정을 자제하는 훈련이 지속적 성장에 필요합니다.',
    work: '빠르게 변화하는 환경과 즉각적인 결과를 볼 수 있는 업무에서 두각을 나타냅니다. 현장 중심의 실질적인 문제 해결 역할에서 최고입니다.' },

  ESFP: { emoji: '🎉', name: '자유로운 엔터테이너', en: 'The Performer',
    core: '활동적이고 낙천적이며 사람들과 함께하는 것을 사랑합니다. 현재 순간을 즐기며 주변에 활기를 불어넣고 실질적인 도움을 제공합니다.',
    strengths: ['탁월한 친화력과 긍정적 팀 분위기 조성', '현실적이고 즉각적인 문제 해결 능력', '진정성 있는 공감과 따뜻한 배려'],
    growth: '장기 계획 수립과 집중력 유지, 감정적 결정 전 충분한 분석 시간을 갖는 습관이 성숙한 성장을 이끕니다.',
    work: '사람들과 직접 상호작용하는 역할에서 에너지를 얻습니다. 유연하고 다양한 활동이 있는 역동적 환경에서 최고의 만족감을 느낍니다.' },

  ENFP: { emoji: '💡', name: '재기발랄한 활동가', en: 'The Champion',
    core: '열정적이고 창의적이며 새로운 아이디어와 가능성을 사랑합니다. 사람들의 잠재력을 믿고 진정성 있는 방식으로 변화를 만들어냅니다.',
    strengths: ['무한한 창의성과 혁신적 아이디어 발굴력', '사람들에 대한 진정한 관심과 공감 능력', '변화와 도전에 대한 탁월한 적응력'],
    growth: '시작한 프로젝트를 끝까지 완수하는 실행력과 세부 사항 관리 능력이 더 큰 영향력으로 이어지는 핵심 성장 과제입니다.',
    work: '창의적 아이디어를 구현할 자유가 주어지는 환경에서 최고의 동기부여를 받습니다. 다양한 사람들과 협업하는 역할을 선호합니다.' },

  ENTP: { emoji: '💬', name: '뜨거운 혁신가', en: 'The Visionary',
    core: '지적 호기심이 강하고 아이디어를 연결하는 능력이 탁월합니다. 논쟁을 통해 최선의 해결책을 찾으며 비효율적 시스템에 도전하는 것을 즐깁니다.',
    strengths: ['탁월한 전략적 사고와 혁신적 문제 해결력', '새로운 관점을 제시하는 창의적 사고력', '빠른 이해력과 다재다능한 적응력'],
    growth: '아이디어를 끝까지 실행하는 완수 능력과 타인의 감정적 필요에 더 세심하게 주의를 기울이는 것이 필요합니다.',
    work: '복잡한 문제를 분석하고 창의적 해결책을 제시하는 역할에서 탁월합니다. 지적 자극이 있고 혁신이 장려되는 환경을 선호합니다.' },

  ESTJ: { emoji: '⚖️', name: '엄격한 관리자', en: 'The Supervisor',
    core: '조직적이고 목표 지향적이며 명확한 책임과 절차를 중시합니다. 체계적인 방법으로 팀을 이끌고 확실한 결과를 만들어내는 실행력이 뛰어납니다.',
    strengths: ['탁월한 조직력과 강력한 리더십', '명확한 원칙에 기반한 의사결정 능력', '목표 달성을 위한 강한 실행력과 추진력'],
    growth: '다양한 접근 방식에 열린 마음을 갖고, 팀원들의 감정과 개인적 상황을 고려하는 유연성이 더 효과적인 리더십으로 이어집니다.',
    work: '명확한 목표와 체계적 구조가 있는 환경에서 최고의 성과를 냅니다. 팀을 이끌고 성과를 관리하는 리더십 역할에서 두각을 나타냅니다.' },

  ESFJ: { emoji: '🤝', name: '사교적인 외교관', en: 'The Provider',
    core: '따뜻하고 협력적이며 주변 사람들의 필요를 세심하게 파악합니다. 조화로운 환경을 만들기 위해 헌신하며 진심 어린 지원을 제공합니다.',
    strengths: ['뛰어난 대인 관계 능력과 따뜻한 배려심', '팀 화합과 긍정적 분위기 조성 능력', '신뢰할 수 있는 강한 책임감과 성실함'],
    growth: '타인의 기대에 지나치게 반응하지 않고 자신의 필요를 인식하며, 비판에 대한 회복탄력성을 키우는 것이 중요합니다.',
    work: '사람들을 지원하고 팀을 하나로 묶는 역할에서 최고의 만족을 느낍니다. 명확한 기대치가 있고 협력적인 팀 환경을 선호합니다.' },

  ENFJ: { emoji: '🏆', name: '정의로운 사회운동가', en: 'The Teacher',
    core: '타고난 리더십으로 사람들의 성장과 잠재력 개발을 돕습니다. 열정적이고 카리스마 있으며 공동의 목표를 향해 팀을 이끄는 능력이 탁월합니다.',
    strengths: ['탁월한 리더십과 영감을 주는 능력', '사람들의 강점을 발견하고 성장시키는 역량', '효과적인 소통과 강한 설득력'],
    growth: '타인에게 집중하다 자신의 필요를 소홀히 하지 않도록 균형을 맞추고, 비판적 사고를 함께 발전시키는 것이 필요합니다.',
    work: '사람들의 성장과 발전에 기여하는 역할에서 최고의 의미를 찾습니다. 비전 공유와 팀 협력이 강조되는 환경에서 뛰어난 성과를 냅니다.' },

  ENTJ: { emoji: '👑', name: '대담한 통솔자', en: 'The Commander',
    core: '결단력 있고 자신감이 넘치며 목표를 향해 팀을 이끄는 타고난 리더입니다. 전략적 사고로 비효율을 개선하고 조직의 성과를 극대화합니다.',
    strengths: ['강력한 리더십과 전략적 통찰력', '명확한 목표 설정과 결단력 있는 실행', '복잡한 조직을 효율적으로 이끄는 능력'],
    growth: '타인의 감정적 필요와 의견에 더 귀 기울이고, 팀원들의 페이스를 고려하는 섬세함이 더 강력한 리더십을 만들어냅니다.',
    work: '전략 수립과 목표 달성을 위해 팀을 이끄는 역할에서 최고의 성과를 냅니다. 도전적인 목표와 충분한 권한이 주어지는 환경을 선호합니다.' },
};

const MS_FONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif';

function calcMBTI(answers: (ScaleVal | null)[]) {
  const dimSum: Record<Dim, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };
  QUESTIONS.forEach((q, i) => {
    const v = answers[i];
    if (v !== null && v !== undefined) dimSum[q.dim] += SCORE_MAP[v];
  });

  const MAX = 10; // 5 questions × 2 max per question
  const info: Record<Dim, { dominant: string; pct: number; aLabel: string; bLabel: string; color: string }> = {} as never;
  for (const d of ['EI', 'SN', 'TF', 'JP'] as Dim[]) {
    const sum = dimSum[d];
    const pct = Math.min(100, Math.round((Math.abs(sum) / MAX) * 100));
    info[d] = {
      dominant: sum <= 0 ? DIM_META[d].a : DIM_META[d].b,
      pct,
      aLabel: DIM_META[d].aFull,
      bLabel: DIM_META[d].bFull,
      color: DIM_META[d].color,
    };
  }
  const type = `${info.EI.dominant}${info.SN.dominant}${info.TF.dominant}${info.JP.dominant}`;
  return { type, info, dimSum };
}

const SCALE_LABELS = ['완전히 A', '주로 A', '중립', '주로 B', '완전히 B'];

export default function MBTIPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(ScaleVal | null)[]>(Array(QUESTIONS.length).fill(null));
  const [hovering, setHovering] = useState<ScaleVal | null>(null);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { document.title = 'MBTI 테스트 | FuN fUn'; }, []);

  const q = QUESTIONS[current];
  const currentAnswer = answers[current];
  const dim = DIM_META[q?.dim ?? 'EI'];
  const progress = ((current + 1) / QUESTIONS.length) * 100;

  function select(v: ScaleVal) {
    if (timerRef.current !== null) return; // 400ms 이동 중 이중 클릭 방지
    const next = [...answers];
    next[current] = v;
    setAnswers(next);

    // 자동 이동
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (current < QUESTIONS.length - 1) {
        setCurrent(c => c + 1);
      } else {
        setDone(true);
      }
    }, 400);
  }

  function goBack() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (current > 0) setCurrent(c => c - 1);
  }

  function reset() {
    setCurrent(0);
    setAnswers(Array(QUESTIONS.length).fill(null));
    setDone(false);
  }

  const mbti = done ? calcMBTI(answers) : null;
  const res = mbti ? RESULTS[mbti.type] : null;

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: '#f3f2f1', fontFamily: MS_FONT, color: '#323130' }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 200, height: '48px', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #edebe9', display: 'flex', alignItems: 'center', padding: '0 2rem', gap: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, cursor: 'pointer' }} onClick={() => router.push('/fun')}>
          <svg width="14" height="14" viewBox="0 0 23 23" fill="none" style={{ flexShrink: 0 }}>
            <rect x="0" y="0" width="10" height="10" fill="#f25022"/><rect x="12" y="0" width="10" height="10" fill="#7fba00"/>
            <rect x="0" y="12" width="10" height="10" fill="#00a4ef"/><rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
          </svg>
          <span style={{ color: '#0078D4', fontSize: '0.98rem', fontWeight: 600 }}>FuN fUn</span>
          <span style={{ color: '#a19f9d', fontSize: '0.98rem', margin: '0 0.2rem' }}>›</span>
          <span style={{ color: '#323130', fontSize: '0.98rem', fontWeight: 600 }}>MBTI 성격 유형 검사</span>
        </div>
        {!done && (
          <span style={{ color: '#605e5c', fontSize: '0.94rem', fontWeight: 600, marginRight: '1rem' }}>{current + 1} / {QUESTIONS.length}</span>
        )}
        <button onClick={() => router.push('/')} style={{ padding: '0.35rem 0.85rem', background: 'transparent', border: '1px solid #8a8886', borderRadius: '2px', cursor: 'pointer', color: '#323130', fontSize: '0.94rem' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f2f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>메인 채팅</button>
      </nav>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #003366 0%, #0078D4 100%)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.1rem', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>🧠</div>
        <div>
          <p style={{ color: '#a8d4f5', fontSize: '0.74rem', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 0.15rem', fontWeight: 600 }}>MBTI · 성격 유형 검사</p>
          <h1 style={{ color: 'white', fontSize: '1.32rem', fontWeight: 700, margin: '0 0 0.1rem', letterSpacing: '-0.3px' }}>MBTI 성격 유형 검사</h1>
          <p style={{ color: '#c7e3f7', margin: 0, fontSize: '0.86rem' }}>5단계 척도 · 20문항 · 전문적 유형 분석</p>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem 3rem', maxWidth: '580px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0' }}>

        {!done ? (
          <>
            {/* 진행 바 */}
            <div style={{ background: 'white', border: '1px solid #edebe9', borderBottom: 'none', padding: '0.85rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ padding: '0.15rem 0.6rem', background: `${dim.color}12`, color: dim.color, border: `1px solid ${dim.color}30`, fontSize: '0.86rem', fontWeight: 700 }}>
                  {DIM_META[q?.dim ?? 'EI'].aFull.split(' ')[0]} · {DIM_META[q?.dim ?? 'EI'].bFull.split(' ')[0]}
                </span>
                <span style={{ fontSize: '0.86rem', color: dim.color, fontWeight: 600 }}>{Math.round(progress)}% 완료</span>
              </div>
              <div style={{ height: '4px', background: '#f3f2f1', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: dim.color, transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* 질문 카드 */}
            <div style={{ background: 'white', border: '1px solid #edebe9', padding: '2rem 1.75rem 1.75rem' }}>

              {/* 안내 (첫 질문에만) */}
              {current === 0 && (
                <div style={{ background: '#f0f6ff', border: '1px solid #cce0ff', padding: '0.6rem 0.9rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#004c9e', lineHeight: 1.5 }}>
                  💡 각 문항에서 <strong>A 성향에 가까울수록 왼쪽</strong>, <strong>B 성향에 가까울수록 오른쪽</strong>을 선택하세요. 선택하면 다음 문항으로 자동 이동합니다.
                </div>
              )}

              <p style={{ margin: '0 0 2rem 0', fontWeight: 700, color: '#323130', fontSize: '1.26rem', lineHeight: 1.65, textAlign: 'center' }}>
                {q.q}
              </p>

              {/* A 선택지 */}
              <div style={{ padding: '0.75rem 1rem', background: '#f8faff', border: '1px solid #d0e4ff', marginBottom: '1.25rem', fontSize: '1.02rem', color: '#003a8c', lineHeight: 1.55, borderRadius: '2px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0078D4', display: 'block', marginBottom: '0.2rem' }}>A</span>
                {q.a}
              </div>

              {/* 5단계 척도 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.4rem' }}>
                  {([1, 2, 3, 4, 5] as ScaleVal[]).map((v) => {
                    const isSelected = currentAnswer === v;
                    const isHover = hovering === v;
                    const isNeutral = v === 3;
                    const activeColor = v <= 2 ? '#0078D4' : v >= 4 ? '#d13438' : '#8a8886';
                    const size = isNeutral ? 38 : 46;
                    return (
                      <button
                        key={v}
                        onClick={() => select(v)}
                        onMouseEnter={() => setHovering(v)}
                        onMouseLeave={() => setHovering(null)}
                        style={{
                          width: `${size}px`,
                          height: `${size}px`,
                          borderRadius: '50%',
                          border: isSelected
                            ? `3px solid ${activeColor}`
                            : isHover
                              ? `2px solid ${activeColor}`
                              : '2px solid #c8c6c4',
                          background: isSelected
                            ? activeColor
                            : isHover
                              ? `${activeColor}15`
                              : 'white',
                          color: isSelected ? 'white' : isHover ? activeColor : '#8a8886',
                          fontSize: isNeutral ? '0.7rem' : '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '0', width: '100%', maxWidth: '270px' }}>
                  {SCALE_LABELS.map((label, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.74rem', color: '#a19f9d', lineHeight: 1.3, padding: '0 0.1rem' }}>
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* B 선택지 */}
              <div style={{ padding: '0.75rem 1rem', background: '#fff8f8', border: '1px solid #ffd0d0', marginBottom: '1.5rem', fontSize: '1.02rem', color: '#8c0000', lineHeight: 1.55, borderRadius: '2px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#d13438', display: 'block', marginBottom: '0.2rem' }}>B</span>
                {q.b}
              </div>

              {/* 이전 버튼 */}
              {current > 0 && (
                <button
                  onClick={goBack}
                  style={{ padding: '0.45rem 1.1rem', background: 'transparent', border: '1px solid #8a8886', borderRadius: '2px', cursor: 'pointer', fontSize: '0.94rem', color: '#605e5c' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f3f2f1'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >← 이전 문항으로</button>
              )}
            </div>
          </>
        ) : mbti && res ? (
          /* ── 결과 화면 ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

            {/* 타입 헤더 */}
            <div style={{ background: 'white', border: '1px solid #edebe9', borderBottom: 'none', padding: '2.5rem 2rem 1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '4.8rem', marginBottom: '0.75rem' }}>{res.emoji}</div>
              <div style={{ display: 'inline-block', padding: '0.4rem 1.75rem', background: '#0078D4', color: 'white', fontSize: '2.16rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '3px' }}>
                {mbti.type}
              </div>
              <div style={{ fontSize: '0.94rem', color: '#a19f9d', marginBottom: '0.35rem' }}>{res.en}</div>
              <h2 style={{ margin: '0', fontSize: '1.5rem', fontWeight: 700, color: '#323130' }}>{res.name}</h2>
            </div>

            {/* 차원별 비율 */}
            <div style={{ background: 'white', border: '1px solid #edebe9', borderBottom: 'none', padding: '1.25rem 1.75rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.94rem', fontWeight: 600, color: '#605e5c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>성격 차원 분석</h3>
              {(['EI', 'SN', 'TF', 'JP'] as Dim[]).map(d => {
                const info = mbti.info[d];
                const isA = info.dominant === DIM_META[d].a;
                const pct = info.pct;
                return (
                  <div key={d} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.96rem', fontWeight: 700, color: info.color, padding: '0.1rem 0.4rem', background: `${info.color}12`, border: `1px solid ${info.color}30` }}>
                          {info.dominant}
                        </span>
                        <span style={{ fontSize: '0.94rem', color: '#323130', fontWeight: 500 }}>
                          {isA ? info.aLabel : info.bLabel}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.9rem', color: info.color, fontWeight: 600 }}>{pct}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#f3f2f1', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${info.color}80, ${info.color})`,
                        borderRadius: '3px',
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.78rem', color: '#a19f9d' }}>{DIM_META[d].aFull}</span>
                      <span style={{ fontSize: '0.78rem', color: '#a19f9d' }}>{DIM_META[d].bFull}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 핵심 성격 */}
            <div style={{ background: 'white', border: '1px solid #edebe9', borderBottom: 'none', padding: '1.25rem 1.75rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.94rem', fontWeight: 600, color: '#605e5c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>핵심 성격</h3>
              <p style={{ margin: 0, fontSize: '1.08rem', color: '#323130', lineHeight: 1.8 }}>{res.core}</p>
            </div>

            {/* 강점 */}
            <div style={{ background: 'white', border: '1px solid #edebe9', borderBottom: 'none', padding: '1.25rem 1.75rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.94rem', fontWeight: 600, color: '#605e5c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>주요 강점</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {res.strengths.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                    <span style={{ color: '#107c10', fontWeight: 700, fontSize: '1.02rem', flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: '1.05rem', color: '#323130', lineHeight: 1.55 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 성장 포인트 */}
            <div style={{ background: 'white', border: '1px solid #edebe9', borderBottom: 'none', padding: '1.25rem 1.75rem', borderLeft: '4px solid #ca5010' }}>
              <h3 style={{ margin: '0 0 0.6rem 0', fontSize: '0.94rem', fontWeight: 600, color: '#605e5c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>성장 포인트</h3>
              <p style={{ margin: 0, fontSize: '1.05rem', color: '#323130', lineHeight: 1.7 }}>{res.growth}</p>
            </div>

            {/* 업무 스타일 */}
            <div style={{ background: 'white', border: '1px solid #edebe9', padding: '1.25rem 1.75rem' }}>
              <h3 style={{ margin: '0 0 0.6rem 0', fontSize: '0.94rem', fontWeight: 600, color: '#605e5c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>업무 스타일</h3>
              <p style={{ margin: 0, fontSize: '1.05rem', color: '#323130', lineHeight: 1.7 }}>{res.work}</p>
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={reset}
                style={{ flex: 1, padding: '0.65rem', background: 'transparent', color: '#0078D4', border: '1px solid #0078D4', borderRadius: '2px', fontSize: '1.02rem', fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#0078D408'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >다시 검사하기</button>
              <button
                onClick={() => router.push('/fun')}
                style={{ flex: 1, padding: '0.65rem', background: '#0078D4', color: 'white', border: 'none', borderRadius: '2px', fontSize: '1.02rem', fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#106ebe'}
                onMouseLeave={e => e.currentTarget.style.background = '#0078D4'}
              >FuN fUn 홈</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
