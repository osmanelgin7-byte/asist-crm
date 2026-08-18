import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' blob: data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["imapflow", "mailparser", "nodemailer"],
  async redirects() {
    return [
      { source: "/stores", destination: "/sigorta-sirketleri", permanent: true },
      { source: "/stores/:path*", destination: "/sigorta-sirketleri", permanent: true },
      { source: "/quotes", destination: "/work-orders", permanent: true },
      { source: "/quotes/:path*", destination: "/work-orders", permanent: true },
      { source: "/tespitler", destination: "/work-orders", permanent: true },
      { source: "/tespitler/:path*", destination: "/work-orders", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
