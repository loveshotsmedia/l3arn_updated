import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable strict mode for better React practices
  reactStrictMode: true,
  // Allow cross-origin requests from Railway API in development
  async headers() {
    return [];
  },
};

export default nextConfig;
