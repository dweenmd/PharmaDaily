import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * X-Frame-Options stops the app being framed, which is what makes
 * clickjacking a POS possible — an invisible overlay over a "Complete sale"
 * button is a real attack on a till.
 *
 * Referrer-Policy keeps invoice ids and other path segments out of the
 * Referer header on outbound links.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    // The POS needs the camera for barcode scanning (Phase 3); everything
    // else stays switched off.
    value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Never ship a build that does not typecheck. This is the default; stating
  // it makes it explicit that it must not be flipped to silence an error
  // under deadline pressure.
  typescript: { ignoreBuildErrors: false },

  // The framework version is a free hint to anyone fingerprinting the stack
  // for known CVEs.
  poweredByHeader: false,

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The service worker must not be cached, or clients keep running an
        // old one and never pick up a new release.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
