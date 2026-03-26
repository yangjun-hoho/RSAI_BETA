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
    bgGradient: 'linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)',
  },
  {
    id: 'press-release',
    title: '보도자료 생성 v2',
    description: '핵심 내용을 입력하면 AI가 공식 보도자료 형식에 맞춰 본문을 자동 작성합니다. 남양주시 보도자료 템플릿이 적용된 HWP 파일로 바로 다운로드할 수 있습니다.',
    badge: '신규',
    previewImage: '/images/work-support2/preview-press-release.png',
    bgGradient: 'linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%)',
  },
  {
    id: 'greeting',
    title: '인사말씀 생성 v2',
    description: '행사명과 핵심 내용을 입력하면 AI가 격식 있는 인사말씀을 자동 작성합니다. 남양주시 인사말씀 템플릿이 적용된 HWP 파일로 바로 다운로드할 수 있습니다.',
    badge: '신규',
    previewImage: '/images/work-support2/preview-greeting.png',
    bgGradient: 'linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)',
  },
  {
    id: 'merit-citation',
    title: '공적조서 생성 v2',
    description: '분야와 핵심 사항을 입력하면 AI가 공무원·일반인 공적조서를 자동 작성합니다. 남양주시 공적조서 템플릿이 적용된 HWP 파일로 바로 다운로드할 수 있습니다.',
    badge: '신규',
    previewImage: '/images/work-support2/preview-merit-citation.png',
    bgGradient: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)',
  },
  {
    id: 'meeting',
    title: '확대간부회의 자료 생성 v2',
    description: '템플릿을 선택하고 핵심 내용을 입력하면 AI가 확대간부회의 자료를 자동 작성합니다. 기본형·교육형·사업형·행사1형·행사2형 5가지 템플릿을 지원하며 HWP 파일로 바로 다운로드할 수 있습니다.',
    badge: '개발중..',
    previewImage: '/images/work-support2/preview-meeting.png',
    bgGradient: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', maxWidth: '1600px' }}>
          {services.map((item) => (
            <button
              key={item.id}
              onClick={() => onOpenService(item.id)}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '0',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                transition: 'box-shadow 0.2s ease',
                textAlign: 'left',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.13)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
              }}
            >
              {/* 상단: 미리보기 이미지 */}
              <div
                style={{
                  height: '180px',
                  flexShrink: 0,
                  background: item.bgGradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewImage}
                  alt={`${item.title} 미리보기`}
                  style={{ height: '100%', width: 'auto', objectFit: 'contain', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '4px' }}
                />
              </div>

              {/* 하단: 텍스트 */}
              <div style={{ flex: 1, padding: '1.1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {item.badge && (
                  <span style={{
                    alignSelf: 'flex-start',
                    fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.55rem',
                    borderRadius: '4px', letterSpacing: '0.03em', ...BADGE_STYLES[item.badge],
                  }}>
                    {item.badge}
                  </span>
                )}
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', lineHeight: 1.35 }}>{item.title}</span>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.7, flexGrow: 1 }}>
                  {item.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600, color: '#2563eb', marginTop: '0.25rem' }}>
                  <span>시작하기</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
