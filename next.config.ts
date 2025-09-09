import type { NextConfig } from "next";

const nextConfig = {
  experimental: {
    // This opts out of the Edge Runtime for middleware.
    middlewareSource: 'node',
  },
};

export default nextConfig;
