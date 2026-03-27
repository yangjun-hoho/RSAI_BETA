export default function PopupMessengerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif", height: '100vh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
