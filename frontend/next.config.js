/** @type {import('next').NextConfig} */
const backend = process.env.BACKEND_URL || 'http://localhost:8000';

module.exports = {
  reactStrictMode: true,
  // Браузер ходит на /api/* того же домена, Vercel проксирует на бэкенд.
  // Так httpOnly-cookie сессии остаётся first-party и работает в Safari/Chrome без third-party cookies.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // код входа лежит в URL /auth/callback — не отдаём его в Referer
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};
