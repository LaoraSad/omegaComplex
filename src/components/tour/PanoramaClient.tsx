'use client';

import dynamic from 'next/dynamic';

// Cargamos el visor solo en el cliente (usa APIs del browser: canvas, Image, ResizeObserver)
const PanoramaViewer = dynamic(() => import('./PanoramaViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-xl bg-black flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      <p className="text-white/50 text-sm">Cargando vista 360°...</p>
    </div>
  ),
});

interface PanoramaClientProps {
  src: string;
  caption?: string;
  hideHud?: boolean;
}

export default function PanoramaClient({ src, caption, hideHud }: PanoramaClientProps) {
  return <PanoramaViewer src={src} caption={caption} autoRotate hideHud={hideHud} />;
}
