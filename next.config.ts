import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Pas d'optimisation images Vercel pour vignettes locales (déjà optimisées)
  images: {
    unoptimized: true,
  },
  // Augmente body size pour stream (Vercel par défaut 4.5MB pour fonctions)
  // Streaming via response Web ReadableStream, pas concerné, mais on permet large
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
