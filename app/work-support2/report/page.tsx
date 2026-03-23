'use client';
import { useRouter } from 'next/navigation';
import ReportPanel from '@/lib/work-support2/report/ReportPanel';

export default function ReportPage() {
  const router = useRouter();
  return (
    <>
      <title>보고서 생성 (v2) | AI 업무지원</title>
      <div style={{ height: '100vh' }}>
        <ReportPanel onBack={() => router.push('/?panel=work-support2')} />
      </div>
    </>
  );
}
