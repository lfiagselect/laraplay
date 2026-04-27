import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
