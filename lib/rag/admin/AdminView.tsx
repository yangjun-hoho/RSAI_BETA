'use client';

import { useState, useEffect } from 'react';
import DocumentManager from './DocumentManager';
import CategoryForm from './CategoryForm';

interface Category {
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
}

export default function AdminView({ onBack }: Props) {
  const [tab, setTab] = useState<'categories' | 'settings'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string>('');

  // 설정 상태
  const [maxDocs, setMaxDocs] = useState<string>('5');
  const [maxFileMb, setMaxFileMb] = useState<string>('10');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  function loadCategories() {
    fetch('/api/rag/admin/categories')
      .then(r => r.json())
      .then(data => {
        const cats: Category[] = data.categories ?? [];
        setCategories(cats);
        // 현재 선택된 카테고리가 없거나 삭제된 경우 첫 번째로 이동
        setSelectedId(prev => {
          if (prev && cats.find(c => c.id === prev)) return prev;
          return cats[0]?.id ?? '';
        });
      })
      .catch(() => {});
  }

  useEffect(() => { loadCategories(); }, []);

  function loadSettings() {
    setSettingsLoading(true);
    fetch('/api/rag/admin/settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings) {
          setMaxDocs(data.settings.user_chatbot_max_docs ?? '5');
          setMaxFileMb(data.settings.user_chatbot_max_file_mb ?? '10');
        }
      })
      .catch(() => {})
      .finally(() => setSettingsLoading(false));
  }

  useEffect(() => { if (tab === 'settings') loadSettings(); }, [tab]);

  async function saveSettings() {
    setSettingsSaving(true);
    setSettingsMsg(null);
    try {
      const res = await fetch('/api/rag/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_chatbot_max_docs: maxDocs, user_chatbot_max_file_mb: maxFileMb }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsMsg({ type: 'err', text: data.error ?? '저장 실패' });
      } else {
        setSettingsMsg({ type: 'ok', text: '설정이 저장되었습니다.' });
      }
    } catch {
      setSettingsMsg({ type: 'err', text: '네트워크 오류가 발생했습니다.' });
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 카테고리를 삭제하시겠습니까?')) return;
    setDeletingId(id);
    setDeleteError('');
    try {
      const res = await fetch(`/api/rag/admin/categories?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error ?? '삭제 실패'); return; }
      loadCategories();
    } catch {
      setDeleteError('네트워크 오류가 발생했습니다.');
    } finally {
      setDeletingId('');
    }
  }

  const selected = categories.find(c => c.id === selectedId);

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
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>⚙️ RAG 관리자</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {(['categories', 'settings'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ padding: '5px 12px', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: tab === t ? 700 : 400, background: tab === t ? '#1e3a5f' : 'transparent', color: tab === t ? 'white' : '#6b7280', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (tab !== t) { e.currentTarget.style.background = '#f3f4f6'; } }}
              onMouseLeave={e => { if (tab !== t) { e.currentTarget.style.background = 'transparent'; } }}
            >
              {t === 'categories' ? '카테고리 관리' : '개인챗봇 제한 설정'}
            </button>
          ))}
        </div>
      </div>

      {/* 설정 탭 */}
      {tab === 'settings' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '480px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>개인 챗봇 제한 설정</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '24px' }}>일반 사용자가 만드는 개인 전용 챗봇에 적용되는 제한 값입니다.</div>

            {settingsLoading ? (
              <div style={{ color: '#9ca3af', fontSize: '13px' }}>불러오는 중...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    최대 문서 수
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={maxDocs}
                      onChange={e => setMaxDocs(e.target.value)}
                      style={{ width: '100px', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', outline: 'none' }}
                    />
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>개 (1~100)</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>개인 챗봇에 업로드할 수 있는 문서의 최대 개수입니다.</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    파일당 최대 크기
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      step={0.5}
                      value={maxFileMb}
                      onChange={e => setMaxFileMb(e.target.value)}
                      style={{ width: '100px', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', outline: 'none' }}
                    />
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>MB (1~500)</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>업로드 가능한 단일 파일의 최대 크기입니다.</div>
                </div>

                {settingsMsg && (
                  <div style={{ padding: '10px 12px', borderRadius: '7px', fontSize: '13px', background: settingsMsg.type === 'ok' ? '#f0fdf4' : '#fef2f2', color: settingsMsg.type === 'ok' ? '#16a34a' : '#ef4444', border: `1px solid ${settingsMsg.type === 'ok' ? '#bbf7d0' : '#fecaca'}` }}>
                    {settingsMsg.text}
                  </div>
                )}

                <button
                  onClick={saveSettings}
                  disabled={settingsSaving}
                  style={{ alignSelf: 'flex-start', padding: '9px 20px', background: settingsSaving ? '#9ca3af' : '#1e3a5f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: settingsSaving ? 'default' : 'pointer' }}
                >
                  {settingsSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 카테고리 탭 본문: 좌우 분할 */}
      {tab === 'categories' && <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 좌측: 카테고리 목록 (비율 2) */}
        <div style={{ flex: 2, minWidth: 0, borderRight: '1px solid #e5e7eb', background: 'white', overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', padding: '4px 10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>카테고리</div>

          {/* 카테고리 버튼 목록 */}
          <div style={{ flex: 1 }}>
            {categories.length === 0 && !showForm && (
              <div style={{ padding: '16px 10px', fontSize: '13px', color: '#9ca3af', lineHeight: 1.6 }}>
                카테고리가 없습니다.<br />아래 버튼으로 추가해주세요.
              </div>
            )}
            {categories.map(cat => (
              <div key={cat.id} style={{ marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => { setSelectedId(cat.id); setDeleteError(''); }}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                      background: selectedId === cat.id ? cat.color + '18' : 'transparent',
                      color: selectedId === cat.id ? cat.color : '#374151',
                      fontWeight: selectedId === cat.id ? 700 : 400,
                      fontSize: '14px', textAlign: 'left', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (selectedId !== cat.id) e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={e => { if (selectedId !== cat.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {cat.icon.startsWith('/')
                      ? <img src={cat.icon} width={22} height={22} alt="" style={{ display: 'block', opacity: 0.75, flexShrink: 0 }} />
                      : <span style={{ fontSize: '18px', flexShrink: 0 }}>{cat.icon}</span>}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                  </button>
                  {/* 수정 버튼 */}
                  <button
                    onClick={() => { setEditingId(editingId === cat.id ? '' : cat.id); setShowForm(false); setDeleteError(''); }}
                    title="카테고리 수정"
                    style={{ padding: '6px 7px', border: 'none', background: editingId === cat.id ? '#eff6ff' : 'transparent', cursor: 'pointer', color: editingId === cat.id ? '#3b82f6' : '#d1d5db', borderRadius: '6px', flexShrink: 0, fontSize: '13px' }}
                    onMouseEnter={e => { if (editingId !== cat.id) { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; } }}
                    onMouseLeave={e => { if (editingId !== cat.id) { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.background = 'transparent'; } }}
                  >
                    ✏️
                  </button>
                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => handleDelete(cat.id)}
                    disabled={deletingId === cat.id}
                    title="카테고리 삭제"
                    style={{ padding: '6px 7px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#d1d5db', borderRadius: '6px', flexShrink: 0, fontSize: '14px' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    🗑
                  </button>
                </div>
                {/* 인라인 수정 폼 */}
                {editingId === cat.id && (
                  <div style={{ marginTop: '4px', marginLeft: '4px', marginRight: '4px' }}>
                    <CategoryForm
                      categoryId={cat.id}
                      initialData={{ name: cat.name, icon: cat.icon, color: cat.color, description: cat.description }}
                      onCreated={() => { setEditingId(''); loadCategories(); }}
                      onCancel={() => setEditingId('')}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 삭제 오류 메시지 */}
          {deleteError && (
            <div style={{ padding: '8px 10px', fontSize: '12px', color: '#ef4444', background: '#fef2f2', borderRadius: '7px', margin: '6px 0' }}>
              {deleteError}
            </div>
          )}

          {/* 카테고리 추가 폼 or 버튼 */}
          <div style={{ marginTop: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
            {showForm ? (
              <CategoryForm
                onCreated={() => { setShowForm(false); loadCategories(); }}
                onCancel={() => setShowForm(false)}
              />
            ) : (
              <button
                onClick={() => { setShowForm(true); setEditingId(''); setDeleteError(''); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', border: '1.5px dashed #d1d5db', borderRadius: '9px', background: 'transparent', cursor: 'pointer', color: '#6b7280', fontSize: '13px', fontWeight: 600 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                카테고리 추가
              </button>
            )}
          </div>
        </div>

        {/* 우측: 문서 관리 (비율 3) */}
        <div style={{ flex: 3, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selected ? (
            <DocumentManager
              key={selected.id}
              categoryId={selected.id}
              categoryName={selected.name}
              categoryColor={selected.color}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', gap: '8px' }}>
              <div style={{ fontSize: '32px' }}>📂</div>
              <div style={{ fontSize: '13px' }}>
                {categories.length === 0 ? '카테고리를 먼저 추가해주세요' : '카테고리를 선택해주세요'}
              </div>
            </div>
          )}
        </div>
      </div>}
    </div>
  );
}
