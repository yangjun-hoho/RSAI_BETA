interface AuditData {
  action: string;
  [key: string]: unknown;
}

export async function logAudit(data: AuditData): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    console.log(`[AUDIT] ${timestamp}`, JSON.stringify(data));
  } catch {
    // 로그 기록 실패는 본 요청에 영향 없음
  }
}
