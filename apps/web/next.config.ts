import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tenaxis/ui"],
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  async rewrites() {
    const apiUrl = process.env.NESTJS_API_URL || 'http://localhost:4000';
    const chatwootUrl = "http://tenaxis-chatwoot-255df7-76-13-101-140.traefik.me";
    
    return [
      // 1. CHATWOOT REAL-TIME (WebSocket)
      {
        source: '/cable',
        destination: `${chatwootUrl}/cable`,
      },
      // 2. AUTH DE CHATWOOT
      {
        source: '/auth/:path*',
        destination: `${chatwootUrl}/auth/:path*`,
      },
      // 3. API DE CHATWOOT
      {
        source: '/api/v1/:path*',
        destination: `${chatwootUrl}/api/v1/:path*`,
      },
      // 4. ARCHIVOS Y MULTIMEDIA (Imágenes, documentos, audios)
      {
        source: '/rails/:path*',
        destination: `${chatwootUrl}/rails/:path*`,
      },
      {
        source: '/storage/:path*',
        destination: `${chatwootUrl}/storage/:path*`,
      },
      // 5. INTERFAZ Y RECURSOS
      {
        source: '/chatwoot-proxy/:path*',
        destination: `${chatwootUrl}/:path*`,
      },
      {
        source: '/app/:path*',
        destination: `${chatwootUrl}/app/:path*`,
      },
      {
        source: '/vite/:path*',
        destination: `${chatwootUrl}/vite/:path*`,
      },
      {
        source: '/assets/:path*',
        destination: `${chatwootUrl}/assets/:path*`,
      },
      {
        source: '/brand-assets/:path*',
        destination: `${chatwootUrl}/brand-assets/:path*`,
      },
      {
        source: '/sw.js',
        destination: `${chatwootUrl}/sw.js`,
      },
      // 6. API DE TENAXIS (Al final)
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
