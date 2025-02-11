import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/discover/1',
      },
      {
        source: '/discover',
        destination: '/discover/1',
      }
    ]
  },
};

export default nextConfig;
