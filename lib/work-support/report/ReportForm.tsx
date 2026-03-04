'use client';

import { useState } from 'react';

interface ReportFormProps {
  onGenerate: (values: Record<string, unknown>) => void;
  isLoading: boolean;
  error: string;
}

const sectionStructures: Record<string, Record<string, string[]>> = {
  plan: {
    basic: ['목적 및 개요', '추진 배경', '추진 계획', '기대 효과'],
    detailed: ['목적 및 개요', '현황 분석', '추진 전략', '세부 실행 계획', '예산 계획', '기대 효과'],
    business: ['사업 개요', '시장 분석', '사업 전략', '재무 계획', '리스크 관리'],
  },
  measure: {
    problem: ['문제 현황', '원인 분석', '해결 방안', '실행 계획', '모니터링'],
    risk: ['리스크 현황', '위험도 평가', '대응 전략', '비상 계획'],
    improvement: ['현황 진단', '문제점 분석', '개선 방안', '실행 로드맵'],
  },
  status: {
    current: ['현황 개요', '주요 지표', '추진 성과', '향후 계획'],
    progress: ['사업 현황', '진척도 분석', '주요 성과', '향후 일정'],
    incident: ['사건 개요', '경위 및 원인', '조치 현황', '재발 방지 대책'],
  },
  analysis: {
    data: ['분석 개요', '데이터 현황', '분석 결과', '시사점'],
    performance: ['성과 개요', '목표 대비 실적', '성과 분석', '개선 방향'],
    trend: ['트렌드 개요', '현황 분석', '전망', '대응 전략'],
  },
  other: {
    memo: ['핵심 내용', '세부 사항', '결론'],
    meeting: ['회의 개요', '주요 논의 사항', '결정 사항', '향후 일정'],
    work: ['업무 현황', '주요 내용', '처리 결과'],
  },
};

const detailTypes: Record<string, Array<{ id: string; label: string }>> = {
  plan: [{ id: 'basic', label: '기본 계획' }, { id: 'detailed', label: '세부 계획' }, { id: 'business', label: '사업계획' }],
  measure: [{ id: 'problem', label: '문제해결' }, { id: 'risk', label: '위기관리' }, { id: 'improvement', label: '개선안' }],
  status: [{ id: 'current', label: '현황' }, { id: 'progress', label: '진행상황' }, { id: 'incident', label: '사건보고' }],
  analysis: [{ id: 'data', label: '데이터분석' }, { id: 'performance', label: '성과분석' }, { id: 'trend', label: '동향분석' }],
  other: [{ id: 'memo', label: '간략메모' }, { id: 'meeting', label: '회의결과' }, { id: 'work', label: '업무메모' }],
};

const sampleTitles: Record<string, string[]> = {
  plan: ['2026년 스마트시티 구축 기본계획', '디지털 전환 추진 세부 계획', 'AI 신규 사업 추진 계획'],
  measure: ['민원 처리 개선 방안', '위기상황 대응 계획', '업무 효율화 방안'],
  status: ['1분기 사업 추진 현황', '주요 업무 진행 현황', '긴급 상황 보고'],
  analysis: ['빅데이터 분석 보고서', '사업 성과 분석', '시장 동향 분석'],
  other: ['업무 협조 요청', '회의 결과 보고', '주간 업무 보고'],
};

const inputStyle: React.CSSProperties = { width: '100%', padding: '0.4rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem', background: 'var(--input-background)', color: 'var(--text-primary)', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' };

const models = [
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', badge: 'Gemini' },
  { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', badge: 'OpenAI' },
];

export default function ReportForm({ onGenerate, isLoading }: ReportFormProps) {
  const [reportTitle, setReportTitle] = useState('');
  const [selectedReportType, setSelectedReportType] = useState('plan');
  const [selectedDetailType, setSelectedDetailType] = useState('basic');
  const [selectedLength, setSelectedLength] = useState('detailed');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-lite');
  const [keyContent, setKeyContent] = useState('');

  const currentDetailTypes = detailTypes[selectedReportType] || [];
  const currentStructure = sectionStructures[selectedReportType]?.[selectedDetailType] || [];

  function handleReportTypeChange(type: string) {
    setSelectedReportType(type);
    setSelectedDetailType(detailTypes[type][0].id);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onGenerate({ reportTitle, selectedReportType, selectedDetailType, selectedLength, selectedModel, keyContent: keyContent.trim() || undefined });
  }

  function setSampleTitle() {
    const samples = sampleTitles[selectedReportType] || sampleTitles.plan;
    setReportTitle(samples[Math.floor(Math.random() * samples.length)]);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Report Settings</h2>
      </div>

      <div>
        <label style={labelStyle}>보고서 제목 *</label>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <input style={{ ...inputStyle, flex: 1 }} type="text" placeholder="보고서 제목을 입력하세요" value={reportTitle} onChange={e => setReportTitle(e.target.value)} required />
          <button type="button" onClick={setSampleTitle} style={{ padding: '0.4rem 0.6rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>예시</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>보고서 유형</label>
          <select style={inputStyle} value={selectedReportType} onChange={e => handleReportTypeChange(e.target.value)}>
            <option value="plan">계획 보고서</option>
            <option value="measure">대책 보고서</option>
            <option value="status">상황 보고서</option>
            <option value="analysis">분석 보고서</option>
            <option value="other">기타 보고서</option>
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label style={labelStyle}>세부 유형</label>
          <select style={inputStyle} value={selectedDetailType} onChange={e => setSelectedDetailType(e.target.value)}>
            {currentDetailTypes.map(dt => (
              <option key={dt.id} value={dt.id}>{dt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>보고서 길이</label>
        <select style={inputStyle} value={selectedLength} onChange={e => setSelectedLength(e.target.value)}>
          <option value="brief">간략</option>
          <option value="standard">표준</option>
          <option value="detailed">상세</option>
        </select>
      </div>

      <div>
        <label style={labelStyle}>보고서 구조 미리보기</label>
        <div style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.6rem 0.8rem', minHeight: '42px', display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.3rem' }}>
            {currentStructure.map((section, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '400', border: '1px solid #bfdbfe' }}>{section}</span>
                {i < currentStructure.length - 1 && (
                  <span style={{ color: '#6b7280', fontSize: '0.7rem', fontWeight: '600' }}>→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label style={labelStyle}>AI 모델</label>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {models.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedModel(m.id)}
              style={{
                flex: 1,
                padding: '0.4rem 0.5rem',
                border: `1px solid ${selectedModel === m.id ? 'var(--focus-color)' : 'var(--border-color)'}`,
                borderRadius: '6px',
                background: selectedModel === m.id ? '#eef2ff' : 'white',
                color: selectedModel === m.id ? 'var(--focus-color)' : 'var(--text-secondary)',
                fontSize: '0.72rem',
                cursor: 'pointer',
                fontWeight: selectedModel === m.id ? '600' : '400',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.1rem',
              }}
            >
              <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{m.badge}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>핵심 내용 <span style={{ fontWeight: 400, color: '#9ca3af' }}>(선택)</span></label>
        <textarea
          value={keyContent}
          onChange={e => setKeyContent(e.target.value)}
          placeholder="보고서에 반드시 포함할 핵심 내용을 입력하세요&#10;예) 2026년 예산 50억 편성, 3단계 추진 일정, 주민 설문 결과 85% 찬성 등"
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      <button type="submit" style={{ width: '100%', padding: '0.65rem', background: 'var(--focus-color)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', opacity: isLoading ? 0.7 : 1 }} disabled={isLoading}>
        {isLoading ? '생성 중...' : '📊 보고서 생성'}
      </button>
    </form>
  );
}
