import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    // Ye line dono values ko sync kar degi
    outputFileTracingRoot: path.join(__dirname, "../../"), 
  },
  // ... aapki baaki config
};

export default nextConfig;
