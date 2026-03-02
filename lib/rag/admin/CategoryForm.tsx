'use client';

import { useState, useEffect } from 'react';

const COLOR_PRESETS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

const EMOJI_PRESETS = [
  '📋', '📁', '📂', '📄', '📑', '📃', '📜', '📊',
  '🐾', '🌿', '🌳', '🍃', '🌱', '🌾', '🦋', '🐕',
  '💰', '💵', '💳', '🏦', '💼', '🗂️', '📦', '🔖',
  '🏛️', '🏢', '🏗️', '🗺️', '📍', '🔧', '⚙️', '🛠️',
  '👥', '👤', '🤝', '🙋', '📣', '📢', '🔔', '📡',
  '⚖️', '🔏', '🛡️', '📌', '✅', '❗', '🔑', '🗝️',
  '🎓', '📚', '✏️', '🖊️', '📖', '🔬', '🧪', '💡',
  '🔥', '🚒', '🚑', '🚨', '⚠️', '🌊', '🌦️', '🌈',
  '🚗', '🚌', '🛣️', '🗃️', '🖥️', '📱', '🖨️', '💻',
  '🏥', '❤️', '🧡', '💛', '💚', '💙', '💜', '🩺',
];

const ICON_LABELS: Record<string, string> = {
  'academic.svg': '교육',
  'balance.svg': '법령/규정',
  'bell.svg': '알림/공지',
  'book.svg': '업무매뉴얼',
  'building.svg': '행정/건물',
  'calendar.svg': '일정/당직',
  'chart.svg': '통계/분석',
  'clipboard.svg': '업무일지',
  'document.svg': '문서/정보',
  'fire.svg': '소방/안전',
  'folder.svg': '일반폴더',
  'heart.svg': '복지/의료',
  'leaf.svg': '환경/녹지',
  'map-pin.svg': '지역/위치',
  'money.svg': '예산/보조금',
  'paw.svg': '동물복지',
  'search.svg': '검색/조사',
  'shield.svg': '안전/보안',
  'users.svg': '주민/민원',
  'wrench.svg': '시설/관리',
};

function getLabel(path: string) {
  const filename = path.split('/').pop() ?? '';
  return ICON_LABELS[filename] ?? filename.replace(/\.\w+$/, '');
}

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

export default function CategoryForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [iconTab, setIconTab] = useState<'emoji' | 'image'>('emoji');
  const [imageIcons, setImageIcons] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/rag/admin/icons')
      .then(r => r.json())
      .then(data => setImageIcons(data.icons ?? []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !icon.trim()) { setError('이름과 아이콘은 필수입니다.'); return; }

    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/rag/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), icon: icon.trim(), color, description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? '생성 실패'); return; }
      onCreated();
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  const isImageIcon = icon.startsWith('/');

  return (
    <form onSubmit={handleSubmit} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '8px' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>새 카테고리</div>

      {/* 이름 */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>이름 *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="예: 정보공개, 동물복지..."
          maxLength={30}
          style={{ width: '100%', padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* 아이콘 선택 */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>아이콘 *</label>

        {/* 미리보기 + 탭 전환 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: color + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, border: '1.5px solid ' + color + '44',
          }}>
            {isImageIcon
              ? <img src={icon} width={22} height={22} alt="" style={{ display: 'block' }} />
              : <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
            }
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['emoji', 'image'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setIconTab(tab)}
                style={{
                  padding: '3px 8px', fontSize: '11px', fontWeight: 600,
                  border: '1px solid ' + (iconTab === tab ? '#3b82f6' : '#d1d5db'),
                  background: iconTab === tab ? '#eff6ff' : 'white',
                  color: iconTab === tab ? '#3b82f6' : '#6b7280',
                  borderRadius: '5px', cursor: 'pointer',
                }}
              >
                {tab === 'emoji' ? '이모지' : '이미지'}
              </button>
            ))}
          </div>
        </div>

        {/* 이모지 탭 */}
        {iconTab === 'emoji' && (
          <div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px',
              maxHeight: '120px', overflowY: 'auto',
              background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px',
            }}>
              {EMOJI_PRESETS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  style={{
                    fontSize: '16px', lineHeight: 1, padding: '3px',
                    background: icon === e ? color + '22' : 'transparent',
                    border: icon === e ? '1.5px solid ' + color : '1.5px solid transparent',
                    borderRadius: '5px', cursor: 'pointer',
                    transition: 'all 0.1s',
                  }}
                  title={e}
                >
                  {e}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: '#9ca3af', whiteSpace: 'nowrap' }}>직접 입력:</span>
              <input
                type="text"
                value={isImageIcon ? '' : icon}
                onChange={e => { if (e.target.value) setIcon(e.target.value); }}
                maxLength={4}
                placeholder="✏️"
                style={{ width: '44px', padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: '5px', fontSize: '14px', textAlign: 'center', outline: 'none' }}
              />
            </div>
          </div>
        )}

        {/* 이미지 탭 */}
        {iconTab === 'image' && (
          imageIcons.length === 0 ? (
            <div style={{ fontSize: '11px', color: '#9ca3af', padding: '8px', textAlign: 'center', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
              이미지 없음 — <code style={{ fontSize: '10px' }}>public/images/rag-images/</code> 에 추가하세요
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px',
              maxHeight: '160px', overflowY: 'auto',
              background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '6px',
            }}>
              {imageIcons.map(src => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setIcon(src)}
                  title={getLabel(src)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                    padding: '5px 3px',
                    background: icon === src ? color + '22' : 'transparent',
                    border: icon === src ? '1.5px solid ' + color : '1.5px solid transparent',
                    borderRadius: '6px', cursor: 'pointer',
                    transition: 'all 0.1s',
                  }}
                >
                  <img src={src} width={24} height={24} alt={getLabel(src)} style={{ display: 'block', opacity: 0.75 }} />
                  <span style={{ fontSize: '9px', color: '#6b7280', lineHeight: 1, textAlign: 'center', overflow: 'hidden', width: '100%', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getLabel(src)}
                  </span>
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* 색상 */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>색상</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {COLOR_PRESETS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{
                width: '20px', height: '20px', borderRadius: '50%',
                background: c, border: color === c ? '2px solid #1f2937' : '2px solid transparent',
                cursor: 'pointer', flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* 설명 */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>시스템 소개 (선택)</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="이 카테고리의 용도를 간단히 설명하세요..."
          rows={2}
          style={{ width: '100%', padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />
      </div>

      {error && <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '8px' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="submit"
          disabled={isLoading}
          style={{ flex: 1, padding: '6px', background: color, color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? '저장 중...' : '저장'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ flex: 1, padding: '6px', background: 'white', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
        >
          취소
        </button>
      </div>
    </form>
  );
}
