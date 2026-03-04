'use client';

import { useState } from 'react';
import { S } from './chatFormStyles';

interface Props {
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function MeritChatForm({ onSubmit, onCancel, isLoading }: Props) {
  const [targetType, setTargetType]             = useState('공무원');
  const [meritField, setMeritField]             = useState('');
  const [majorAchievements, setMajorAchievements] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!meritField.trim()) return;
    if (!majorAchievements.trim()) return;
    onSubmit({ targetType, meritField, majorAchievements });
  }

  return (
    <form onSubmit={handleSubmit} style={S.card}>
      <div style={S.header}>
        <div>
          <h3 style={S.h3}>🏆 공적조서 생성</h3>
          <p style={S.desc}>공적 대상과 분야, 주요 실적을 입력하세요</p>
        </div>
        <button type="button" onClick={onCancel} style={S.closeBtn} title="닫기">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div style={S.content}>
        {/* 공적 대상 */}
        <div>
          <label style={S.label}>공적 대상</label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {['공무원', '일반인', '단체'].map(type => (
              <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.84rem', color: '#37352f', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value={type}
                  checked={targetType === type}
                  onChange={() => setTargetType(type)}
                  disabled={isLoading}
                  style={{ margin: 0 }}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        {/* 공적 분야 */}
        <div>
          <label style={S.label}>공적조서 분야 *</label>
          <input
            type="text"
            style={S.input}
            placeholder="예: 대중교통, 체납세, 시정발전, 환경정비 등"
            value={meritField}
            onChange={e => setMeritField(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        {/* 주요 실적 */}
        <div>
          <label style={S.label}>주요 실적 *</label>
          <textarea
            style={{ ...S.input, resize: 'vertical', minHeight: '90px', lineHeight: 1.4 }}
            placeholder={'구체적인 업무 성과 또는 기여도를 입력하세요.\n\n예시:\n- 인·허가 업무 1,300여건 처리\n- 체납세 독촉 및 우편 알림 서비스'}
            value={majorAchievements}
            onChange={e => setMajorAchievements(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
      </div>

      <div style={S.actions}>
        <button type="button" style={S.cancelBtn} onClick={onCancel} disabled={isLoading}>취소</button>
        <button type="submit" style={{ ...S.submitBtn, opacity: isLoading ? 0.5 : 1 }} disabled={isLoading}>
          {isLoading ? '생성 중...' : '공적조서 생성'}
        </button>
      </div>
    </form>
  );
}
