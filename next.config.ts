import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/Along',
  assetPrefix: '/Along/',
  images: {
    unoptimized: true
  },
  trailingSlash: true
};

export default nextConfig;
