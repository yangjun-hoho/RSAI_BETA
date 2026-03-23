'use client';

interface Props {
  onClose: () => void;
  onOpenService: (serviceId: string) => void;
}

const services = [
  {
    id: 'report',
    title: '보고서 생성 v2',
    description: '핵심 내용을 입력하면 AI가 구조화된 업무보고서를 자동 생성합니다. 섹션·소제목·표 등 다양한 구성을 지원하며 HWP 파일로 바로 다운로드할 수 있습니다.',
    badge: '신규',
    previewImage: '/images/work-support2/preview-report.png',
  },
  {
    id: 'press-release',
    title: '보도자료 생성 v2',
    description: '핵심 내용을 입력하면 AI가 공식 보도자료 형식에 맞춰 본문을 자동 작성합니다. 남양주시 보도자료 템플릿이 적용된 HWP 파일로 바로 다운로드할 수 있습니다.',
    badge: '신규',
    previewImage: '/images/work-support2/preview-press-release.png',
  },
  {
    id: 'greeting',
    title: '인사말씀 생성 v2',
    description: '행사명과 핵심 내용을 입력하면 AI가 격식 있는 인사말씀을 자동 작성합니다. 남양주시 인사말씀 템플릿이 적용된 HWP 파일로 바로 다운로드할 수 있습니다.',
    badge: '신규',
    previewImage: '/images/work-support2/preview-greeting.png',
  },
  {
    id: 'merit-citation',
    title: '공적조서 생성 v2',
    description: '분야와 핵심 사항을 입력하면 AI가 공무원·일반인 공적조서를 자동 작성합니다. 남양주시 공적조서 템플릿이 적용된 HWP 파일로 바로 다운로드할 수 있습니다.',
    badge: '신규',
    previewImage: '/images/work-support2/preview-merit-citation.png',
  },
];

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  '신규': { background: '#f3e8ff', color: '#7c3aed' },
  '베타': { background: '#dbeafe', color: '#1e40af' },
};

export default function WorkSupport2View({ onClose, onOpenService }: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#faf9f5' }}>
      {/* 헤더 */}
      <div style={{
        height: '40px', padding: '0 1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        borderBottom: '1px solid #e9e9e7', background: '#f7f6f3', flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1f2937' }}>⚡ 업무 지원 2</span>
        <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>새롭게 설계된 AI 업무 도구 모음</span>
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.25rem 0.6rem', border: '1px solid #e5e7eb',
              borderRadius: '6px', background: '#fff', cursor: 'pointer',
              fontSize: '0.78rem', color: '#6b7280', fontWeight: 500,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            닫기
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem', maxWidth: '900px' }}>
          {services.map((item) => (
            <button
              key={item.id}
              onClick={() => onOpenService(item.id)}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'stretch',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                overflow: 'hidden',
                position: 'relative',
                height: '238px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* 좌측: 텍스트 */}
              <div style={{ flex: 1, padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {item.badge && (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.45rem',
                        borderRadius: '20px', letterSpacing: '0.04em', ...BADGE_STYLES[item.badge],
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{item.title}</span>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.75 }}>
                    {item.description}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: '#6366f1' }}>
                  <span>시작하기</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>

              {/* 우측: 미리보기 이미지 */}
              <div style={{
                width: '180px',
                flexShrink: 0,
                background: '#e9eaec',
                borderLeft: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewImage}
                  alt={`${item.title} 미리보기`}
                  style={{ height: '100%', width: 'auto', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
