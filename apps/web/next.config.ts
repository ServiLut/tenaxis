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
    return [
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
