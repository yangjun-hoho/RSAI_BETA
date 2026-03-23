'use client';
import { DocumentNode } from '@/types/work-support2';

interface Props {
  nodes: DocumentNode[];
}

export default function MeritCitationPreviewPanel({ nodes }: Props) {
  const fieldNode = nodes.find(n => n.type === 'FIELD');
  const summaryNode = nodes.find(n => n.type === 'SUMMARY');
  const detailNode = nodes.find(n => n.type === 'DETAIL');
  const bulletNodes = nodes.filter(n => n.type === 'BULLET');
  const conclusionNode = nodes.find(n => n.type === 'CONCLUSION');

  return (
    <div style={{ background: '#e5e7eb', minHeight: '100%', display: 'flex', justifyContent: 'center', padding: '32px 24px' }}>
      <div style={{ background: '#fff', width: '680px', maxWidth: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', flexShrink: 0 }}>

        {/* 헤더: 로고 + 그라디언트 바 + 제목 */}
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/work-support2/greeting-logo.png" alt="남양주시 로고" style={{ height: '28px', width: 'auto' }} />
          </div>
          <div style={{ height: '6px', background: 'linear-gradient(to right, #1a5fa8, #3bba6e)', borderRadius: '1px', marginBottom: '2px' }} />
          <div style={{ height: '3px', background: '#c8cdd4', marginBottom: '12px' }} />
          <div style={{ background: 'linear-gradient(135deg, #1a5fa8 0%, #2d7dd2 60%, #3bba6e 100%)', padding: '18px 24px' }}>
            <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff', textAlign: 'center', letterSpacing: '0.12em', fontFamily: '"Noto Sans KR", sans-serif' }}>
              공적조서(안)
            </p>
          </div>
        </div>

        {/* 본문 */}
        <div style={{ padding: '20px 40px 48px', fontFamily: '"Noto Sans KR", sans-serif', fontSize: '0.87rem', lineHeight: 1.9, color: '#1f2937' }}>
          {nodes.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '0.9rem', textAlign: 'center', padding: '60px 0' }}>
              공적조서를 생성하면 미리보기가 표시됩니다.
            </div>
          ) : (
            <>
              {/* 분야 */}
              {fieldNode && (
                <p style={{ margin: '0 0 10px', fontWeight: 600 }}>{fieldNode.content}</p>
              )}

              <div style={{ marginBottom: '10px' }} />

              {/* 개요 */}
              <p style={{ margin: '0 0 6px', fontWeight: 700 }}>■ 공적조서 개요(80자 내외)</p>
              {summaryNode && (
                <p style={{ margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{summaryNode.content}</p>
              )}

              <div style={{ marginBottom: '10px' }} />

              {/* 사항 */}
              <p style={{ margin: '0 0 6px', fontWeight: 700 }}>■ 공적조서 사항(500자 내외)</p>
              {detailNode && (
                <p style={{ margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{detailNode.content}</p>
              )}

              <div style={{ marginBottom: '10px' }} />

              {bulletNodes.map((node, i) => (
                <div key={i}>
                  <p style={{ margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{node.content}</p>
                  {i < bulletNodes.length - 1 && <div style={{ marginBottom: '4px' }} />}
                </div>
              ))}

              {conclusionNode && (
                <>
                  <div style={{ marginBottom: '10px' }} />
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{conclusionNode.content}</p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
