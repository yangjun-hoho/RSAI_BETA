// 팝업 전용 레이아웃 — 루트 layout의 사이드바/헤더 제외
export default function PopupChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#ffffff', height: '100vh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
