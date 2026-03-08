'use client';

import { useState, useEffect } from 'react';
import DocumentManager from './admin/DocumentManager';

const COLOR_PRESETS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

const EMOJI_PRESETS = [
  '📋', '📁', '📂', '📄', '📑', '📃', '📊', '📚',
  '💼', '🗂️', '📦', '🔖', '💡', '🔬', '🎓', '✏️',
  '🌿', '🌸', '⭐', '🏆', '🎯', '🔑', '💎', '🚀',
  '🐾', '🌳', '🍃', '💰', '🛠️', '📣', '🛡️', '🤝',
];

interface UserCat {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  document_count: number;
  chunk_count: number;
}

interface Props {
  onBack: () => void;
  onOpenChat: (categoryId: string) => void;
}

function openPopup(categoryId: string) {
  const w = 480, h = 720;
  const left = Math.max(0, window.screen.width - w - 20);
  const top = Math.max(0, window.screen.height - h - 60);
  window.open(
    `/popup-chat/${categoryId}`,
    `rag-popup-${categoryId}`,
    `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no,resizable=yes`
  );
}

interface FormProps {
  initial?: UserCat;
  onSave: (data: { name: string; icon: string; color: string; description: string }) => Promise<void>;
  onCancel?: () => void;
  saving: boolean;
  error: string;
  isEdit?: boolean;
}

function ChatbotForm({ initial, onSave, onCancel, saving, error, isEdit }: FormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '📁');
  const [color, setColor] = useState(initial?.color ?? COLOR_PRESETS[0]);
  const [description, setDescription] = useState(initial?.description ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({ name: name.trim(), icon, color, description: description.trim() });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 이름 */}
      <div>
        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 600 }}>챗봇 이름 *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="예: 내 업무 자료, 개인 메모..."
          maxLength={30}
          style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => { e.currentTarget.style.borderColor = color; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; }}
        />
      </div>

      {/* 아이콘 */}
      <div>
        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px', fontWeight: 600 }}>아이콘 *</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: color + '22', border: '1.5px solid ' + color + '44',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0,
          }}>
            {icon}
          </div>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>선택된 아이콘</span>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '3px',
          background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '6px',
          maxHeight: '110px', overflowY: 'auto',
        }}>
          {EMOJI_PRESETS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setIcon(e)}
              style={{
                fontSize: '17px', lineHeight: 1, padding: '4px',
                background: icon === e ? color + '22' : 'transparent',
                border: icon === e ? '1.5px solid ' + color : '1.5px solid transparent',
                borderRadius: '6px', cursor: 'pointer',
              }}
            >{e}</button>
          ))}
        </div>
      </div>

      {/* 색상 */}
      <div>
        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px', fontWeight: 600 }}>색상</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {COLOR_PRESETS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: c, border: color === c ? '2.5px solid #1f2937' : '2.5px solid transparent',
                cursor: 'pointer', flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* 설명 */}
      <div>
        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 600 }}>소개 (선택)</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="이 챗봇의 용도를 간단히 설명하세요..."
          rows={2}
          style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '13px', resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />
      </div>

      {error && <div style={{ fontSize: '12px', color: '#ef4444', padding: '6px 10px', background: '#fef2f2', borderRadius: '6px' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="submit"
          disabled={saving}
          style={{ flex: 1, padding: '9px', background: color, color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? '저장 중...' : isEdit ? '수정 완료' : '챗봇 만들기'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ flex: 1, padding: '9px', background: 'white', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}

export default function UserChatbotPanel({ onBack, onOpenChat }: Props) {
  const [loading, setLoading] = useState(true);
  const [userCat, setUserCat] = useState<UserCat | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function fetchUserCat() {
    try {
      const res = await fetch('/api/rag/user/category');
      const data = await res.json();
      setUserCat(data.category ?? null);
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUserCat(); }, []);

  async function handleCreate(data: { name: string; icon: string; color: string; description: string }) {
    if (!data.name) { setError('이름을 입력해주세요.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/rag/user/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? '생성 실패'); return; }
      await fetchUserCat();
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(data: { name: string; icon: string; color: string; description: string }) {
    if (!data.name) { setError('이름을 입력해주세요.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/rag/user/category', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? '수정 실패'); return; }
      setEditing(false);
      await fetchUserCat();
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('내 챗봇을 삭제하시겠습니까?\n업로드한 모든 문서도 함께 삭제됩니다.')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/rag/user/category', { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); alert(d.error ?? '삭제 실패'); return; }
      setUserCat(null);
      setEditing(false);
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f9fafb' }}>
      {/* 헤더 */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', background: 'white', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', background: 'white', cursor: 'pointer', color: '#6b7280', fontSize: '13px' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          뒤로
        </button>
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>내 전용 챗봇</span>
        <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '4px' }}>나만 볼 수 있는 개인 AI 챗봇</span>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: '60px', color: '#9ca3af', fontSize: '14px' }}>불러오는 중...</div>
        ) : !userCat ? (
          /* ── 챗봇 없음: 생성 폼 ── */
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>👤</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>아직 내 챗봇이 없습니다</div>
              <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
                나만 볼 수 있는 전용 AI 챗봇을 만들어보세요.<br />
                원하는 문서를 업로드하면 AI가 답변해드립니다.
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1.5px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <ChatbotForm onSave={handleCreate} saving={saving} error={error} />
            </div>
          </div>
        ) : editing ? (
          /* ── 수정 폼 ── */
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1.5px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '16px' }}>챗봇 정보 수정</div>
              <ChatbotForm
                initial={userCat}
                onSave={handleEdit}
                onCancel={() => { setEditing(false); setError(''); }}
                saving={saving}
                error={error}
                isEdit
              />
            </div>
          </div>
        ) : (
          /* ── 챗봇 있음: 관리 화면 ── */
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* 챗봇 정보 카드 */}
            <div style={{
              background: 'white', borderRadius: '14px', padding: '20px',
              border: '2px dashed ' + userCat.color + '66',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0,
                  background: userCat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px',
                  border: '1.5px solid ' + userCat.color + '33',
                }}>
                  {userCat.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{userCat.name}</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', background: '#dcfce7', color: '#16a34a', borderRadius: '20px', letterSpacing: '0.02em' }}>나만의</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', lineHeight: 1.5 }}>
                    {userCat.description || '나만 볼 수 있는 전용 AI 챗봇입니다.'}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', padding: '3px 8px', background: userCat.color + '14', color: userCat.color, borderRadius: '20px', fontWeight: 600 }}>
                      문서 {userCat.document_count}개
                    </span>
                    {userCat.chunk_count > 0 && (
                      <span style={{ fontSize: '11px', padding: '3px 8px', background: '#f3f4f6', color: '#6b7280', borderRadius: '20px' }}>
                        {userCat.chunk_count.toLocaleString()}청크
                      </span>
                    )}
                  </div>
                  {/* 액션 버튼 */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => onOpenChat(userCat.id)}
                      style={{ padding: '7px 16px', background: userCat.color, color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                    >
                      채팅 열기
                    </button>
                    <button
                      onClick={() => openPopup(userCat.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 14px', background: 'white', color: '#374151', border: '1.5px solid #d1d5db', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      팝업
                    </button>
                    <button
                      onClick={() => { setEditing(true); setError(''); }}
                      style={{ padding: '7px 14px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#e0f2fe'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f0f9ff'; }}
                    >
                      수정
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{ padding: '7px 14px', background: 'white', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}
                      onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = '#fef2f2'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                    >
                      {deleting ? '삭제 중...' : '챗봇 삭제'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 문서 관리 */}
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontSize: '13px', fontWeight: 700, color: '#374151' }}>
                문서 관리
              </div>
              <DocumentManager
                key={userCat.id}
                categoryId={userCat.id}
                categoryName={userCat.name}
                categoryColor={userCat.color}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
