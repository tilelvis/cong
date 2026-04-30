import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This tells Next.js to include the drizzle folder in the deployment
  experimental: {
    outputFileTracingIncludes: {
      '/**': ['./drizzle/**/*'],
    },
  },
};

export default nextConfig;
