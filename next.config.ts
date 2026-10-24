import type { NextConfig } from 'next';

const isVercel = process.env.VERCEL === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Keep standalone output for self-hosted deployments; Vercel builds its own bundle.
  ...(isVercel ? {} : { output: 'standalone' }),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Keep PGLite external to the server bundle so its native module
  // resolution works inside serverless runtimes.
  serverExternalPackages: ['@electric-sql/pglite'],
  transpilePackages: [],
};

export default nextConfig;
