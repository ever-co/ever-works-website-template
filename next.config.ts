import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverRuntimeConfig: {
    cloneUrl: process.env.GITHUB_REPOSITORY,
    token: process.env.GITHUB_APIKEY,
  }
};

export default nextConfig;
