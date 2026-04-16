import type { NextConfig } from "next";

const config: NextConfig = {
  // ─── Server external packages ──────────────────────────────────────────────
  //
  // These packages use Node.js APIs that cannot be bundled by webpack.
  // Next.js will require() them at runtime instead of bundling them.
  //
  serverExternalPackages: ["puppeteer", "puppeteer-core", "bcryptjs"],

  // ─── Image domains ────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: new URL("https://uew.edu.gh/").hostname }, // Allow images from the University of Education, Winneba website
    ],
  },

  // ─── Body size limit for bulk CSV uploads ─────────────────────────────────
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },

  // ─── Security headers ─────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default config;
