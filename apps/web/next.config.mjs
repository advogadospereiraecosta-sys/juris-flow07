/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Linting executado mas não bloqueia o build — corrige warnings separadamente
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  transpilePackages: [
    '@juris-flow/ui',
    '@juris-flow/ai',
    '@juris-flow/db',
    '@juris-flow/config',
    '@juris-flow/types',
    '@juris-flow/auth',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
