'use client';

import Link from 'next/link';

const sections = [
  {
    title: '1. 이용 목적 및 범위',
    icon: '📌',
    items: [
      '본 시스템(AI Work Space)은 남양주시청 직원의 업무 효율화를 위한 내부망 전용 AI 서비스입니다.',
      '업무 관련 목적으로만 사용하며, 개인적 용도나 외부 서비스 목적으로의 사용을 금합니다.',
      '시스템 사용은 재직 중인 남양주시청 직원에 한하며, 퇴직·전출 시 즉시 사용이 제한됩니다.',
    ],
  },
  {
    title: '2. 입력 금지 정보',
    icon: '🚫',
    highlight: true,
    items: [
      '개인식별정보: 주민등록번호, 외국인등록번호, 여권번호',
      '금융정보: 계좌번호, 카드번호, 금융거래 정보',
      '비밀 및 대외비 문서 내용 (보안업무규정 제4조)',
      '타인의 개인정보 (성명, 연락처, 주소 등)',
      '기관 내부의 미공개 행정 정보',
      '비밀번호 및 인증 자격증명',
    ],
  },
  {
    title: '3. AI 출력 결과 활용 주의사항',
    icon: '⚠️',
    items: [
      'AI가 생성한 내용은 반드시 담당자가 검토·확인 후 사용하세요. AI는 오류를 포함할 수 있습니다.',
      '공문서, 보도자료, 공적조서 등 공식 문서로 활용 전 내용의 정확성을 직접 검증하세요.',
      'AI 응답을 무단으로 외부에 공개하거나 타 시스템에 공유하지 마세요.',
      'RAG(지식검색) 기능 활용 시 참조된 출처 문서를 반드시 확인하세요.',
    ],
  },
  {
    title: '4. 계정 보안 수칙',
    icon: '🔑',
    items: [
      '계정(별칭·비밀번호)은 타인과 공유하지 마세요.',
      '비밀번호는 영문 대소문자·숫자·특수문자를 포함하여 8자 이상으로 설정하세요.',
      '정기적으로 비밀번호를 변경하고, 동일 비밀번호를 다른 서비스에 재사용하지 마세요.',
      '업무 종료 후 반드시 로그아웃하세요.',
      '타인이 내 계정으로 접속한 정황을 발견하면 즉시 관리자에게 신고하세요.',
    ],
  },
  {
    title: '5. 데이터 보안',
    icon: '🛡️',
    items: [
      'AI 응답 화면을 캡처하여 외부 메신저·SNS·이메일로 전송하지 마세요.',
      'RAG 시스템에 업로드하는 문서는 공개 가능한 자료에 한합니다. 기밀·대외비 문서는 업로드 금지.',
      'AI 생성 결과물을 USB, 개인 클라우드에 저장하지 마세요.',
      '시스템에서 다운로드한 파일(보고서, PPT 등)의 보안등급을 확인 후 관리하세요.',
    ],
  },
  {
    title: '6. 이상징후 신고',
    icon: '📞',
    items: [
      '비정상적인 시스템 동작, 오류, 보안 의심 상황 발생 시 즉시 관리자에게 신고하세요.',
      'AI가 개인정보, 기밀정보를 포함한 응답을 출력하는 경우 즉시 신고하세요.',
      '본인이 접속하지 않은 기록(감사 로그)이 확인되면 관리자에게 통보하세요.',
      '신고: 정보통신과 담당자 또는 시스템 관리자',
    ],
  },
  {
    title: '7. 위반 시 조치',
    icon: '⚖️',
    items: [
      '보안수칙 위반 시 「개인정보 보호법」, 「보안업무규정」 등 관련 법령에 따라 징계 처분을 받을 수 있습니다.',
      '의도적 정보 유출은 형사처벌 대상이 될 수 있습니다.',
      '위반 행위는 시스템 감사 로그를 통해 확인됩니다.',
    ],
  },
];

export default function SecurityGuidePage() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#faf9f5', overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{ background: 'white', borderBottom: '1px solid #e9e9e7', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#37352f' }}>🔒 보안수칙 및 이용약관</span>
        <Link href="/" style={{ fontSize: '0.82rem', color: '#9b9a97', textDecoration: 'none' }}>← 메인으로</Link>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* 상단 안내 */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e40af', marginBottom: '0.4rem' }}>남양주시청 AI Work Space 보안수칙 및 이용약관</div>
          <div style={{ fontSize: '0.83rem', color: '#1e40af', lineHeight: 1.6 }}>
            본 시스템은 남양주시청 내부망 전용 AI 서비스입니다. 아래 보안수칙을 숙지하고 준수하여 주시기 바랍니다.
            시스템 사용은 본 수칙에 동의한 것으로 간주합니다.
          </div>
        </div>

        {/* 섹션 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sections.map((sec) => (
            <div
              key={sec.title}
              style={{
                background: 'white',
                borderRadius: '10px',
                border: sec.highlight ? '1px solid #fca5a5' : '1px solid #e9e9e7',
                padding: '1.25rem 1.5rem',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: sec.highlight ? '#dc2626' : '#37352f', marginBottom: '0.75rem' }}>
                {sec.icon} {sec.title}
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {sec.items.map((item, i) => (
                  <li key={i} style={{ fontSize: '0.85rem', color: sec.highlight ? '#7f1d1d' : '#37352f', lineHeight: 1.6 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 하단 */}
        <div style={{ textAlign: 'center', marginTop: '2rem', padding: '1rem', fontSize: '0.78rem', color: '#9b9a97' }}>
          남양주시청 AI Work Space | 정보통신과 | 최종 업데이트: 2026년 3월
        </div>
      </div>
      </div>
    </div>
  );
}
