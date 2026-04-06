import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  reactStrictMode: true, 

  typescript: {
    ignoreBuildErrors: false, 
  },

  eslint: {
    ignoreDuringBuilds: true, 
  },

  images: {
    unoptimized: true, 
  },
};

export default nextConfig;
