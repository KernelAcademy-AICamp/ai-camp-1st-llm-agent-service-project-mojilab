/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Disable static page generation for pages that use client-side auth
  experimental: {
    // This helps with SSR issues when using client-side contexts
  },
};

export default nextConfig;
