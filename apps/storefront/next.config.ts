import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@harbor/shared", "@harbor/ui"],
};

export default nextConfig;
