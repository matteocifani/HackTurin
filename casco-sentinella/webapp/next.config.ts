import type { NextConfig } from 'next'

// In produzione (`pnpm build`) il sito viene esportato in HTML/JS statici dentro `out/`,
// che FastAPI serve da `server/static/ui/` (unico server a runtime, nessun Node).
// In sviluppo (`pnpm dev`, porta 3000) le chiamate /api/* vengono girate al server FastAPI sulla 8000.
const produzione = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  agentRules: false,
  ...(produzione
    ? { output: 'export' as const, images: { unoptimized: true } }
    : {
        async rewrites() {
          return [{ source: '/api/:path*', destination: 'http://127.0.0.1:8000/api/:path*' }]
        },
      }),
}

export default nextConfig
