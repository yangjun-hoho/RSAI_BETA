'use client';
import { useState, useEffect } from 'react';

const LS_KEY_OPENAI = 'rsai-model-openai';
const LS_KEY_GOOGLE = 'rsai-model-google';

export const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';
export const DEFAULT_GOOGLE_MODEL = 'gemini-2.5-flash-lite';

export function getSavedModels() {
  if (typeof window === 'undefined') return { openai: DEFAULT_OPENAI_MODEL, google: DEFAULT_GOOGLE_MODEL };
  return {
    openai: localStorage.getItem(LS_KEY_OPENAI) || DEFAULT_OPENAI_MODEL,
    google: localStorage.getItem(LS_KEY_GOOGLE) || DEFAULT_GOOGLE_MODEL,
  };
}

type Status = 'idle' | 'checking' | 'ok' | 'error';

interface FieldState {
  value: string;
  status: Status;
  message: string;
}

interface Props {
  onClose: () => void;
  onSaved: (openai: string, google: string) => void;
}

export default function ModelSettingsView({ onClose, onSaved }: Props) {
  const [openai, setOpenai] = useState<FieldState>({ value: DEFAULT_OPENAI_MODEL, status: 'idle', message: '' });
  const [google, setGoogle] = useState<FieldState>({ value: DEFAULT_GOOGLE_MODEL, status: 'idle', message: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const m = getSavedModels();
    setOpenai(s => ({ ...s, value: m.openai }));
    setGoogle(s => ({ ...s, value: m.google }));
  }, []);

  async function validate(provider: 'openai' | 'google') {
    const current = provider === 'openai' ? openai : google;
    const set = provider === 'openai' ? setOpenai : setGoogle;

    if (!current.value.trim()) {
      set(s => ({ ...s, status: 'error', message: '모델명을 입력해주세요.' }));
      return;
    }

    set(s => ({ ...s, status: 'checking', message: '' }));
    try {
      const res = await fetch('/api/admin/validate-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model: current.value.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        set(s => ({ ...s, status: 'ok', message: '사용 가능한 모델입니다.' }));
      } else {
        set(s => ({ ...s, status: 'error', message: data.error || '유효하지 않은 모델입니다.' }));
      }
    } catch {
      set(s => ({ ...s, status: 'error', message: '검증 중 오류가 발생했습니다.' }));
    }
  }

  function handleSave() {
    localStorage.setItem(LS_KEY_OPENAI, openai.value.trim());
    localStorage.setItem(LS_KEY_GOOGLE, google.value.trim());
    onSaved(openai.value.trim(), google.value.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const canSave = openai.status === 'ok' && google.status === 'ok';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#faf9f5' }}>
      {/* 헤더 */}
      <div style={{
        height: '40px', padding: '0 1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        borderBottom: '1px solid #e9e9e7', background: '#f7f6f3', flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1f2937' }}>⚙️ AI 모델 설정</span>
        <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>채팅에 사용할 AI 모델을 설정합니다</span>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={onClose} style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.25rem 0.6rem', border: '1px solid #e5e7eb',
            borderRadius: '6px', background: '#fff', cursor: 'pointer',
            fontSize: '0.78rem', color: '#6b7280', fontWeight: 500,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            닫기
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '520px' }}>

        {/* OpenAI */}
        <ModelField
          label="OpenAI 모델"
          placeholder="예: gpt-5.4-mini, gpt-4.1-mini"
          field={openai}
          onChange={v => setOpenai({ value: v, status: 'idle', message: '' })}
          onValidate={() => validate('openai')}
        />

        {/* Google */}
        <ModelField
          label="Google 모델"
          placeholder="예: gemini-2.5-flash-lite, gemini-2.0-flash"
          field={google}
          onChange={v => setGoogle({ value: v, status: 'idle', message: '' })}
          onValidate={() => validate('google')}
        />

        {/* 안내 */}
        <div style={{ padding: '0.875rem 1rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', fontSize: '0.78rem', color: '#0369a1', lineHeight: 1.6 }}>
          모델명 입력 후 <strong>확인</strong> 버튼으로 유효성을 검사하세요.<br />
          두 모델 모두 확인이 완료되어야 저장할 수 있습니다.
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            padding: '0.65rem 1.5rem',
            background: saved ? '#16a34a' : canSave ? '#4f46e5' : '#e5e7eb',
            color: canSave ? '#fff' : '#9ca3af',
            border: 'none', borderRadius: '8px',
            fontWeight: 600, fontSize: '0.875rem',
            cursor: canSave ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            alignSelf: 'flex-start',
          }}
        >
          {saved ? '✓ 저장 완료' : '저장'}
        </button>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === 'checking') return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </svg>
  );
  if (status === 'ok') return <span style={{ color: '#16a34a', fontSize: '0.95rem' }}>✓</span>;
  if (status === 'error') return <span style={{ color: '#dc2626', fontSize: '0.95rem' }}>✗</span>;
  return null;
}

function ModelField({ label, placeholder, field, onChange, onValidate }: {
  label: string;
  placeholder: string;
  field: FieldState;
  onChange: (v: string) => void;
  onValidate: () => void;
}) {
  const borderColor = field.status === 'ok' ? '#16a34a' : field.status === 'error' ? '#dc2626' : '#d1d5db';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{label}</label>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: `1px solid ${borderColor}`, borderRadius: '7px', background: '#fff', padding: '0 0.75rem', gap: '0.4rem', transition: 'border-color 0.15s' }}>
          <input
            type="text"
            value={field.value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onValidate(); }}
            placeholder={placeholder}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.82rem', padding: '0.45rem 0', background: 'transparent', color: '#111827' }}
          />
          <StatusIcon status={field.status} />
        </div>
        <button
          onClick={onValidate}
          disabled={field.status === 'checking'}
          style={{
            padding: '0.45rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '7px',
            background: '#fff', fontSize: '0.78rem', fontWeight: 600, color: '#374151',
            cursor: field.status === 'checking' ? 'not-allowed' : 'pointer', flexShrink: 0,
          }}
          onMouseEnter={e => { if (field.status !== 'checking') e.currentTarget.style.background = '#f3f4f6'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
        >
          확인
        </button>
      </div>
      {field.message && (
        <span style={{ fontSize: '0.75rem', color: field.status === 'ok' ? '#16a34a' : '#dc2626', marginLeft: '2px' }}>
          {field.message}
        </span>
      )}
    </div>
  );
}
