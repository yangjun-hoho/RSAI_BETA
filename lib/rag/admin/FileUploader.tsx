'use client';

import { useRef, useState } from 'react';

interface Props {
  categoryId: string;
  onUploaded: () => void;
}

export default function FileUploader({ categoryId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  async function upload(file: File) {
    setUploading(true);
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('categoryId', categoryId);
      const res = await fetch('/api/rag/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '업로드 실패');
      setMessage(`✅ "${file.name}" 업로드 완료. 임베딩 처리 중...`);
      onUploaded();
    } catch (e) {
      setMessage(`❌ ${e instanceof Error ? e.message : '오류 발생'}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#3b82f6' : '#d1d5db'}`,
          borderRadius: '10px',
          padding: '20px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: dragging ? '#eff6ff' : '#f9fafb',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ fontSize: '28px', marginBottom: '6px' }}>📁</div>
        <div style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>
          {uploading ? '업로드 중...' : '파일을 드래그하거나 클릭하여 선택'}
        </div>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>PDF, DOCX, TXT 지원</div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }}
        />
      </div>
      <div style={{ marginTop: '8px', fontSize: '11px', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '6px 10px' }}>
        ⚠️ <strong>공개 데이터만 등록 가능합니다.</strong> 기밀·민감 정보가 포함된 문서는 업로드하지 마세요. 부적절한 문서는 관리자가 즉시 삭제 조치합니다.
      </div>
      {message && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: message.startsWith('✅') ? '#10b981' : '#ef4444', padding: '6px 10px', background: message.startsWith('✅') ? '#ecfdf5' : '#fef2f2', borderRadius: '6px' }}>
          {message}
        </div>
      )}
    </div>
  );
}
