export default function PopupTextTransformLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif", height: '100vh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
