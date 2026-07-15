import type { NextConfig } from "next";

/**
 * AstroKalki Next.js config.
 *
 * Security notes:
 *   - Security headers are applied via BOTH `headers()` here (covers static
 *     assets + serves as the source of truth) AND `src/middleware.ts`
 *     (covers dynamic routes + can override per-path). Either alone is
 *     sufficient; both together is defense in depth.
 *   - `ignoreBuildErrors: false` — all TS errors in app code are now fixed;
 *     non-app dirs (examples/, scripts/, skills/, workspace-analysis/) are
 *     excluded via tsconfig.json exclude so they no longer block the build.
 *   - `reactStrictMode: false` because the production build was set up this
 *     way in prior tasks and we are not changing runtime behavior here.
 */

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "frame-src https://www.youtube-nocookie.com https://youtube-nocookie.com https://cal.com https://*.cal.com",
      "connect-src 'self' ws: wss: http://localhost:* https://localhost:*",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ") + ";",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    ".space-z.ai",
  ],
  images: {
    // Local hero image is served responsively via next/image — AVIF first
    // for ~50% smaller payloads, WebP fallback for older browsers.
    formats: ["image/avif", "image/webp"],
    // Breakpoints covering mobile (640) through 4K-cinematic (2048).
    // Matches the hero's `sizes="100vw"` so Next.js generates a srcset
    // with one optimized file per device class.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // API responses: never cache
      {
        source: "/api/:path*",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
