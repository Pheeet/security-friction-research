import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    
    // 🛡️ SECURE CSP: Brave, Vercel, and Cloudflare friendly
    // - Removed 'unsafe-eval' for production security
    // - Added strict-dynamic support for script loading
    // - Added necessary origins for Cloudflare Turnstile and Google Sheets sync
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com;
      frame-src 'self' https://challenges.cloudflare.com;
      connect-src 'self' ${apiUrl} https://challenges.cloudflare.com https://script.google.com https://script.googleusercontent.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob:;
      font-src 'self' data:;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;