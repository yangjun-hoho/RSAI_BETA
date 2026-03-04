'use client';

import { useState } from 'react';
import { S } from './chatFormStyles';

interface Props {
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const speechCategories = ['기념식/행사', '공식 회의/세미나', '시상식', '개회식/개막식', '폐회식/폐막식', '교육/연수'];
const greetingTypes    = ['격식체', '반격식체', '친근체'];
const speakers         = ['기관장', '부기관장', '부서장', '담당자', '내빈'];
const audienceTypes    = ['일반 시민', '공무원', '전문가', '학생', '기업인'];
const speechLengths    = ['짧게 (1분 내외)', '보통 (3분 내외)', '길게 (5분 이상)'];
const seasons          = ['봄', '여름', '가을', '겨울', '연초', '연말'];

export default function GreetingChatForm({ onSubmit, onCancel, isLoading }: Props) {
  const [specificSituation, setSpecificSituation] = useState('');
  const [speechCategory, setSpeechCategory]       = useState('기념식/행사');
  const [greetingType, setGreetingType]           = useState('격식체');
  const [speaker, setSpeaker]                     = useState('기관장');
  const [audienceType, setAudienceType]           = useState('일반 시민');
  const [speechLength, setSpeechLength]           = useState('보통 (3분 내외)');
  const [season, setSeason]                       = useState('봄');
  const [coreContent, setCoreContent]             = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!specificSituation.trim()) return;
    onSubmit({ specificSituation, speechCategory, greetingType, speaker, audienceType, speechLength, season, coreContent, quoteType1: '없음', quoteType2: '없음' });
  }

  const sel = (value: string, onChange: (v: string) => void, options: string[]) => (
    <select
      style={S.input}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={isLoading}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <form onSubmit={handleSubmit} style={S.card}>
      <div style={S.header}>
        <div>
          <h3 style={S.h3}>💬 인사말씀 생성</h3>
          <p style={S.desc}>행사 정보와 연설 옵션을 입력하세요</p>
        </div>
        <button type="button" onClick={onCancel} style={S.closeBtn} title="닫기">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div style={S.content}>
        <div>
          <label style={S.label}>구체적 명칭 *</label>
          <input
            type="text"
            style={S.input}
            placeholder="예: 제14회 북한강 축제, 2025 시민의 날 기념식"
            value={specificSituation}
            onChange={e => setSpecificSituation(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div style={S.row}>
          <div>
            <label style={S.label}>상황 선택</label>
            {sel(speechCategory, setSpeechCategory, speechCategories)}
          </div>
          <div>
            <label style={S.label}>인사말 성격</label>
            {sel(greetingType, setGreetingType, greetingTypes)}
          </div>
        </div>

        <div style={S.row}>
          <div>
            <label style={S.label}>연설자</label>
            {sel(speaker, setSpeaker, speakers)}
          </div>
          <div>
            <label style={S.label}>주요 청중</label>
            {sel(audienceType, setAudienceType, audienceTypes)}
          </div>
        </div>

        <div style={S.row}>
          <div>
            <label style={S.label}>말씀 길이</label>
            {sel(speechLength, setSpeechLength, speechLengths)}
          </div>
          <div>
            <label style={S.label}>계절/시기</label>
            {sel(season, setSeason, seasons)}
          </div>
        </div>

        <div>
          <label style={S.label}>추가 내용 (선택)</label>
          <textarea
            style={{ ...S.input, resize: 'vertical', minHeight: '60px', lineHeight: 1.4 }}
            placeholder="전달사항, 특이사항, 지역 현안 등을 입력하세요."
            value={coreContent}
            onChange={e => setCoreContent(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <div style={S.actions}>
        <button type="button" style={S.cancelBtn} onClick={onCancel} disabled={isLoading}>취소</button>
        <button type="submit" style={{ ...S.submitBtn, opacity: isLoading ? 0.5 : 1 }} disabled={isLoading}>
          {isLoading ? '생성 중...' : '인사말씀 생성'}
        </button>
      </div>
    </form>
  );
}
