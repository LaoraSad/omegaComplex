'use client';

interface PanningImageProps {
  src: string;
  alt: string;
  /** Duración de cada recorrido (ida o vuelta) en segundos. */
  duration?: number;
  /** Escala de la imagen (>1 crea el margen para el paneo). */
  zoom?: number;
  className?: string;
}

/**
 * Imagen panorámica con paneo infinito ping-pong (CSS puro, sin WebGL).
 *
 * La imagen se amplía (`zoom`) dentro de un contenedor con overflow hidden
 * y se desplaza de derecha a izquierda y de vuelta, de forma infinita.
 * El recorrido se limita al margen que deja la escala, así nunca se ven
 * bordes vacíos. Se pausa al hover/toque y respeta prefers-reduced-motion.
 */
export default function PanningImage({ src, alt, duration = 22, zoom = 1.25, className = '' }: PanningImageProps) {
  // Recorrido máximo en % sin mostrar fondo: la mitad del excedente de escala.
  // Ej. zoom 1.25 → excedente 25% → ±12.5% es seguro; usamos ±10% con margen.
  const travel = Math.max(0, ((zoom - 1) / 2) * 100 - 2.5);

  return (
    <div className={`omega-pan-viewport ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="omega-pan-img"
        style={{
          transform: `scale(${zoom})`,
          // @ts-expect-error CSS custom properties para los keyframes
          '--pan-from': `${travel.toFixed(2)}%`,
          '--pan-to': `-${travel.toFixed(2)}%`,
          '--pan-duration': `${duration}s`,
        }}
      />
    </div>
  );
}
