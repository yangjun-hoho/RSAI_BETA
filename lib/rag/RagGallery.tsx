'use client';

import { useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  document_count: number;
  chunk_count: number;
}

interface UserCat extends Category {
  created_by: number | null;
  is_public: number;
}

interface Props {
  onSelectCategory: (categoryId: string) => void;
  onAdmin: () => void;
  onManageChatbot: () => void;
  onClose?: () => void;
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

export default function RagGallery({ onSelectCategory, onAdmin, onManageChatbot, onClose }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userCat, setUserCat] = useState<UserCat | null>(null);
  const [userCatLoaded, setUserCatLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/rag/admin/categories')
      .then(r => r.json())
      .then(data => setCategories(data.categories ?? []))
      .catch(() => {});

    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/rag/user/category').then(r => r.json()),
    ]).then(([authData, catData]) => {
      const user = authData.user;
      setIsAdmin(user?.role === 'admin');
      setIsLoggedIn(!!user);
      setUserCat(user && user.role !== 'admin' ? (catData.category ?? null) : null);
    }).catch(() => {}).finally(() => setUserCatLoaded(true));
  }, []);

  const showPersonalSection = isLoggedIn && !isAdmin;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f9f9f7' }}>
      {/* 헤더 */}
      <div style={{ padding: '1.25rem 2rem 1rem', borderBottom: '1px solid #e9e9e7', background: 'white', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.1rem', fontWeight: 700, color: '#1a1a1a' }}>🧠 RAG 지식 검색</h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b6b6b' }}>카테고리를 선택하면 등록된 문서를 기반으로 AI가 답변합니다</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <button
              onClick={onAdmin}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.35rem 0.85rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '7px', cursor: 'pointer', color: '#0369a1', fontSize: '0.78rem', fontWeight: 600 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e0f2fe'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f0f9ff'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              관리자
            </button>
          )}
          <button
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: 'transparent', border: '1px solid #e0e0e0', borderRadius: '7px', cursor: 'pointer', color: '#6b6b6b', fontSize: '0.78rem', fontWeight: 500 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f9f9f7'; e.currentTarget.style.color = '#1a1a1a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b6b6b'; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            홈
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>

        {/* 완전 빈 상태: 공용 카테고리 없고 개인 섹션도 없을 때 */}
        {categories.length === 0 && !showPersonalSection ? (
          <div style={{ textAlign: 'center', paddingTop: '60px', color: '#9ca3af' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📂</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>등록된 카테고리가 없습니다</div>
            <div style={{ fontSize: '13px', marginBottom: '16px' }}>관리자 페이지에서 카테고리를 추가해주세요.</div>
            {isAdmin && (
              <button
                onClick={onAdmin}
                style={{ padding: '8px 18px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                관리자 페이지로 이동
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── 공용 AI 챗봇 섹션 ── */}
            {categories.length > 0 && (
              <div style={{ marginBottom: showPersonalSection ? '2.5rem' : 0 }}>
                {showPersonalSection && (
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    공용 AI 챗봇
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                  {categories.map(cat => (
                    <div
                      key={cat.id}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                        padding: '1.1rem', background: 'white', border: '1.5px solid #e9e9e7',
                        borderRadius: '12px', textAlign: 'left',
                        transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = cat.color;
                        e.currentTarget.style.boxShadow = `0 4px 16px ${cat.color}22`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#e9e9e7';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', marginBottom: '10px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: cat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                          {cat.icon.startsWith('/')
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={cat.icon} width={28} height={28} alt="" style={{ display: 'block', opacity: 0.8 }} />
                            : cat.icon}
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', background: '#eff6ff', color: '#3b82f6', borderRadius: '20px', letterSpacing: '0.02em', marginLeft: 'auto' }}>공용</span>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a1a', marginBottom: '6px' }}>{cat.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b6b6b', lineHeight: 1.5, marginBottom: '12px' }}>{cat.description || '등록된 문서를 기반으로 AI가 답변합니다.'}</div>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '11px', padding: '3px 8px', background: cat.color + '14', color: cat.color, borderRadius: '20px', fontWeight: 600 }}>
                          문서 {cat.document_count}개
                        </span>
                        {cat.chunk_count > 0 && (
                          <span style={{ fontSize: '11px', padding: '3px 8px', background: '#f3f4f6', color: '#6b7280', borderRadius: '20px' }}>
                            {cat.chunk_count.toLocaleString()}청크
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: 'auto' }}>
                        <button
                          onClick={() => onSelectCategory(cat.id)}
                          style={{ flex: 1, padding: '7px 0', fontSize: '12px', fontWeight: 600, background: cat.color, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', transition: 'opacity 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                        >
                          채팅 열기
                        </button>
                        <button
                          onClick={() => openPopup(cat.id)}
                          title="별도 창으로 열기"
                          style={{ flex: 1, padding: '7px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#374151', border: '1.5px solid #d1d5db', borderRadius: '7px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#9ca3af'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          팝업 채팅창
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 내 전용 챗봇 섹션 (로그인 사용자 & 비관리자만) ── */}
            {showPersonalSection && userCatLoaded && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  내 전용 챗봇
                </div>
                {userCat ? (
                  /* 개인 챗봇 카드 */
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                    <div
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                        padding: '1.1rem', background: 'white',
                        border: '2px dashed ' + userCat.color + '88',
                        borderRadius: '12px', textAlign: 'left',
                        transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = userCat.color;
                        e.currentTarget.style.boxShadow = `0 4px 16px ${userCat.color}22`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = userCat.color + '88';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', marginBottom: '10px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: userCat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                          {userCat.icon}
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', background: '#dcfce7', color: '#16a34a', borderRadius: '20px', letterSpacing: '0.02em', marginLeft: 'auto' }}>나만의</span>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a1a', marginBottom: '6px' }}>{userCat.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b6b6b', lineHeight: 1.5, marginBottom: '12px' }}>{userCat.description || '나만 볼 수 있는 전용 AI 챗봇입니다.'}</div>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '11px', padding: '3px 8px', background: userCat.color + '14', color: userCat.color, borderRadius: '20px', fontWeight: 600 }}>
                          문서 {userCat.document_count}개
                        </span>
                        {userCat.chunk_count > 0 && (
                          <span style={{ fontSize: '11px', padding: '3px 8px', background: '#f3f4f6', color: '#6b7280', borderRadius: '20px' }}>
                            {userCat.chunk_count.toLocaleString()}청크
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: 'auto' }}>
                        <button
                          onClick={() => onSelectCategory(userCat.id)}
                          style={{ flex: 1, padding: '7px 0', fontSize: '12px', fontWeight: 600, background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', transition: 'opacity 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                        >
                          채팅 열기
                        </button>
                        <button
                          onClick={onManageChatbot}
                          style={{ flex: 1, padding: '7px 0', fontSize: '12px', fontWeight: 600, background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0', borderRadius: '7px', cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; }}
                        >
                          관리
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 챗봇 만들기 초대 카드 */
                  <div
                    onClick={onManageChatbot}
                    style={{
                      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '2rem 2.5rem', background: 'white',
                      border: '2px dashed #d1d5db', borderRadius: '12px',
                      cursor: 'pointer', transition: 'all 0.15s', minWidth: '180px', textAlign: 'center',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = 'white'; }}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '10px' }}>👤</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>내 챗봇 만들기</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.5 }}>나만 볼 수 있는<br />전용 AI 챗봇</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
