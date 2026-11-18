import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // El escáner de QR usa la cámara del propio origen; el resto no la necesita.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

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
      // Next solo acepta calidades declaradas acá. Sin el 85, cada <Image>
      // con quality={85} avisa por consola y genera una peticion inespacial.
      qualities: [70, 75, 85],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          // HSTS solo tiene sentido sirviendo por HTTPS (producción).
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
