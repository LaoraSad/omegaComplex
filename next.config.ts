import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  images: {
    // AVIF primero (más liviano), WebP como fallback. Sharp hace el encodeo.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 1080, 1600, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    // Las fotos del complejo casi no cambian: caché largo en el servidor.
    minimumCacheTTL: 31536000,
  },
};

export default nextConfig;