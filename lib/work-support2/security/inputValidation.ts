import { NextResponse } from 'next/server';

export function rejectIfTooLong(value: string, max: number): NextResponse | null {
  if (value && value.length > max) {
    return NextResponse.json(
      { error: `입력이 너무 깁니다`, current: value.length, max },
      { status: 400 }
    );
  }
  return null;
}
