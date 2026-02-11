import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: 
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com; " +
              "frame-src https://challenges.cloudflare.com; " +
              "connect-src 'self' http://localhost:8080 https://challenges.cloudflare.com; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob:;"
          },
        ],
      },
    ];
  },
};

export default nextConfig;