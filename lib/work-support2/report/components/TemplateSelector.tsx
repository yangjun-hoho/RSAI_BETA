'use client';
import { useEffect, useState } from 'react';
import { TemplateInfo } from '@/types/work-support2';

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function TemplateSelector({ selectedId, onSelect }: Props) {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/work-support2/report/templates')
      .then(r => r.json())
      .then(data => { setTemplates(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '1rem', color: '#888' }}>템플릿 로딩 중...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>문서 양식 선택</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {templates.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: `2px solid ${selectedId === t.id ? '#4f46e5' : '#e5e7eb'}`,
              background: selectedId === t.id ? '#eef2ff' : '#fff',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: selectedId === t.id ? '#4f46e5' : '#111827' }}>{t.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>{t.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
