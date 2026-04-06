import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  reactStrictMode: true, 

  typescript: {
    ignoreBuildErrors: false, 
  },


  images: {
    unoptimized: true, 
  },
};

export default nextConfig;
