'use client';
import { DocumentNode } from '@/types/work-support2';

interface Props {
  nodes: DocumentNode[];
  formData: Record<string, unknown>;
}

export default function MeetingPreviewPanel({ nodes }: Props) {
  if (nodes.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ marginBottom: '12px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <p style={{ margin: 0 }}>왼쪽 양식을 작성하고<br/>AI 생성 버튼을 눌러주세요</p>
        </div>
      </div>
    );
  }

  const titleNode = nodes.find(n => n.type === 'TITLE');
  const subtitleNode = nodes.find(n => n.type === 'SUBTITLE');
  const bodyNodes = nodes.filter(n => n.type !== 'TITLE' && n.type !== 'SUBTITLE');

  return (
    <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto', fontFamily: '"Noto Sans KR", "Malgun Gothic", sans-serif' }}>
      {/* 헤더 테이블 미리보기 */}
      <div style={{ border: '2px solid #1f2937', marginBottom: '8px' }}>
        {/* 제목 행 */}
        <div style={{ padding: '10px', background: '#f3f4f6', textAlign: 'center' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>
            {titleNode?.content || '(제목)'}
          </div>
          {subtitleNode && (
            <div style={{ fontSize: '0.82rem', color: '#374151', marginTop: '4px' }}>
              ◇ {subtitleNode.content}
            </div>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {bodyNodes.map((node, i) => (
          <NodeRow key={i} node={node} />
        ))}
      </div>
    </div>
  );
}

function NodeRow({ node }: { node: DocumentNode }) {
  switch (node.type) {
    case 'SECTION':
      return (
        <div style={{ padding: '6px 10px', background: '#e5e7eb', fontWeight: 700, fontSize: '0.88rem', color: '#111827', marginTop: '8px', borderLeft: '4px solid #4f46e5' }}>
          ■ {node.content}
        </div>
      );
    case 'BULLET':
      return (
        <div style={{ padding: '4px 10px 4px 20px', fontSize: '0.85rem', color: '#1f2937' }}>
          ○ {node.content}
        </div>
      );
    case 'SUBBULLET':
      return (
        <div style={{ padding: '3px 10px 3px 36px', fontSize: '0.82rem', color: '#374151' }}>
          - {node.content}
        </div>
      );
    case 'NOTE':
      return (
        <div style={{ padding: '4px 10px 4px 20px', fontSize: '0.82rem', color: '#6b7280', fontStyle: 'italic' }}>
          ※ {node.content}
        </div>
      );
    case 'COOPERATION':
      return (
        <div style={{ padding: '6px 10px', background: '#fef3c7', fontWeight: 700, fontSize: '0.88rem', color: '#92400e', marginTop: '8px', borderLeft: '4px solid #f59e0b' }}>
          ■ 협조사항 {node.content}
        </div>
      );
    default:
      return null;
  }
}
