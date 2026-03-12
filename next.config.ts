import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  // Security headers are centralized in proxy.ts to avoid duplicated/conflicting policies.
  images: {
    formats: ["image/avif", "image/webp"],
    domains: [],
  },
};

export default nextConfig;
