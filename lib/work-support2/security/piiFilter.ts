import { NextResponse } from 'next/server';

// 한국 개인정보 기본 패턴 (DB 의존성 없이 독립 동작)
const PII_PATTERNS: { type: string; regex: RegExp; hint: string }[] = [
  { type: '주민등록번호', regex: /\d{6}-[1-4]\d{6}/, hint: '주민등록번호 형식' },
  { type: '전화번호', regex: /01[016789]-?\d{3,4}-?\d{4}/, hint: '휴대폰 번호 형식' },
  { type: '이메일', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, hint: '이메일 주소 형식' },
  { type: '계좌번호', regex: /\d{3,6}-\d{2,6}-\d{4,8}/, hint: '계좌번호 형식' },
  { type: '신용카드', regex: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/, hint: '카드번호 형식' },
];

export function checkPii(text: string): { detected: boolean; type?: string; hint?: string } {
  for (const { type, regex, hint } of PII_PATTERNS) {
    if (regex.test(text)) return { detected: true, type, hint };
  }
  return { detected: false };
}

export function rejectIfPii(text: string): NextResponse | null {
  const result = checkPii(text);
  if (result.detected) {
    return NextResponse.json(
      { error: '개인정보가 포함된 것 같습니다', type: result.type, hint: result.hint },
      { status: 400 }
    );
  }
  return null;
}
