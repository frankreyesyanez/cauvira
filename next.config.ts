import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
