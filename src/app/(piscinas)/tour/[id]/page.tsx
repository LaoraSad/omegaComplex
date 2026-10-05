import { notFound } from 'next/navigation';
import { pools } from '@/lib/piscinas/pools-data';
import PanoramaClient from '@/components/piscinas/PanoramaClient';
import WaveBackground from '@/components/piscinas/WaveBackground';
import Link from 'next/link';
import type { Metadata } from 'next';

// Genera metadata dinámica
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const pool = pools.find((p) => p.id === id);
  if (!pool) return { title: 'No encontrado' };
  return {
    title: `${pool.name} | Piscinas 360°`,
    description: pool.description,
  };
}

// Genera rutas estáticas
export function generateStaticParams() {
  return pools.map((p) => ({ id: p.id }));
}

export default async function TourPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pool = pools.find((p) => p.id === id);
  if (!pool) notFound();

  // Piscinas relacionadas (las otras)
  const related = pools.filter((p) => p.id !== pool.id);

  return (
    <div className="relative min-h-screen">
      <WaveBackground />
      {/* Back */}
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-4">
        <Link
          href="/piscinas/inicio"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-rose-300 transition-colors"
        >
          ← Volver a la galería
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-24">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">{pool.name}</h1>
              <p className="text-white/50 mt-1 flex items-center gap-1">
                📍 {pool.location}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {pool.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs bg-rose-500/15 text-rose-300 border border-rose-500/25"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <p className="text-white/60 max-w-2xl">{pool.description}</p>
        </div>

        {/* 360° Viewer */}
        <div className="w-full h-[520px] mb-8">
          <PanoramaClient
            src={pool.panoramaUrl}
            caption={pool.name}
          />
        </div>

        {/* Controls hint */}
        <div className="flex flex-wrap gap-4 justify-center mb-12 text-xs text-white/40">
          <span>🖱️ Arrastra para girar</span>
          <span>🔍 Scroll para zoom</span>
          <span>📱 Toca y desliza en móvil</span>
          <span>⛶ Pantalla completa disponible</span>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="font-semibold text-white mb-4">✨ Características</h3>
            <ul className="space-y-2">
              {pool.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-white/70 text-sm">
                  <span className="text-rose-400">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="font-semibold text-white mb-4">📊 Datos</h3>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-white/50">Valoración</dt>
                <dd className="text-yellow-400">{'★'.repeat(pool.rating)}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-white/50">Ubicación</dt>
                <dd className="text-white/80">{pool.location}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-white/50">ID API</dt>
                <dd>
                  <code className="text-xs bg-white/10 px-2 py-0.5 rounded text-rose-300">
                    /api/pools/{pool.id}
                  </code>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Related */}
        <h2 className="text-xl font-semibold mb-6 text-white">Otros tours</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {related.map((r) => (
            <Link
              key={r.id}
              href={`/tour/${r.id}`}
              className="group flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-rose-500/40 transition-all"
            >
              <div className="relative w-24 h-16 rounded-lg overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.thumbnailUrl}
                  alt={r.name}
                  className="w-full h-full object-cover object-center pano-pan transition-all duration-300"
                />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-white text-sm truncate">{r.name}</p>
                <p className="text-white/50 text-xs mt-0.5">📍 {r.location}</p>
                <p className="text-rose-400 text-xs mt-1 group-hover:underline">Ver 360° →</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
