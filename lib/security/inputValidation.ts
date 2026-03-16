import { NextResponse } from 'next/server';

interface LengthRule {
  value: string | undefined | null;
  label: string;
  max: number;
}

/**
 * 입력 필드별 최대 길이 초과 여부를 검사하고
 * 위반 시 400 응답을 반환합니다.
 */
export function rejectIfTooLong(rules: LengthRule[]): NextResponse | null {
  for (const { value, label, max } of rules) {
    if (value && value.length > max) {
      return NextResponse.json(
        {
          error: `입력이 너무 깁니다`,
          field: label,
          current: value.length,
          max,
        },
        { status: 400 }
      );
    }
  }
  return null;
}
