'use client';
import { useState } from 'react';
import { DocumentNode } from '@/types/work-support2';

interface Props {
  templateId: string;
  nodes: DocumentNode[];
  fileName?: string;
  disabled?: boolean;
  apiPath?: string;
  buttonStyle?: React.CSSProperties;
}

export default function DownloadButton({ templateId, nodes, fileName = 'report', disabled, apiPath = '/api/work-support2/report/render', buttonStyle }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, nodes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'HWPX 생성 실패');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.hwpx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={disabled || loading || nodes.length === 0}
        style={{
          padding: '0.6rem 1.25rem',
          background: loading ? '#9ca3af' : '#4f46e5',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          ...buttonStyle,
        }}
      >
        {loading ? '생성 중...' : 'HWP 다운로드'}
      </button>
      {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{error}</p>}
    </div>
  );
}
