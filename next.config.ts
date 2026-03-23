import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'pptxgenjs', 'better-sqlite3'],
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // 클릭재킹 방지 (내부 사용자 보호)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // MIME 타입 스니핑 방지
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // XSS 차단 (구형 브라우저)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Referrer 정보 제한 (내부 시스템 간 URL 노출 방지)
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // 불필요한 브라우저 기능 차단
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Strict-Transport-Security(HSTS): 내부망 HTTP 전용 운영으로 해당 없음
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // tailwindcss를 프로젝트 node_modules에서 명시적으로 resolve
    config.resolve.alias = {
      ...config.resolve.alias,
      tailwindcss: path.resolve('./node_modules/tailwindcss'),
    };
    if (isServer) {
      // leaflet은 브라우저 전용 라이브러리 - 서버 번들에서 제외 (production build용)
      config.externals = [...(config.externals ?? []), 'leaflet'];
    }
    return config;
  },
};

export default nextConfig;
