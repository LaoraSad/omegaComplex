'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import NextImage from 'next/image';
import { X, Expand, Download, ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';

interface PanoramaModalProps {
  src: string;
  title?: string;
  subtitle?: string;
  trigger: React.ReactNode;
}

/**
 * Lightbox premium: abre la foto completa con zoom, descarga y animación.
 * Solo se usa en la publicación (detalle), no en la lista de servicios.
 */
export default function PanoramaModal({ src, title, subtitle, trigger }: PanoramaModalProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);

  const clampPan = useCallback((x: number, y: number, z: number) => {
    const el = viewportRef.current;
    if (!el || z <= 1) return { x: 0, y: 0 };
    // El desplazamiento máximo es la mitad del excedente que crea el zoom.
    const maxX = ((el.clientWidth * z - el.clientWidth) / 2) * 0.9;
    const maxY = ((el.clientHeight * z - el.clientHeight) / 2) * 0.9;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const applyZoom = useCallback((z: number) => {
    const next = Math.max(1, Math.min(3, +z.toFixed(2)));
    zoomRef.current = next;
    setZoom(next);
    const clamped = clampPan(panRef.current.x, panRef.current.y, next);
    panRef.current = clamped;
    setPan(clamped);
  }, [clampPan]);

  const resetView = useCallback(() => {
    zoomRef.current = 1;
    setZoom(1);
    panRef.current = { x: 0, y: 0 };
    setPan({ x: 0, y: 0 });
    setDragging(false);
  }, []);

  const openModal = useCallback(() => {
    resetView();
    setOpen(true);
  }, [resetView]);

  const close = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => {
      setOpen(false);
      resetView();
    }, 180);
  }, [resetView]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const zoomIn = () => applyZoom(zoomRef.current + 0.5);
  const zoomOut = () => applyZoom(zoomRef.current - 0.5);
  const resetZoom = () => applyZoom(1);

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoomRef.current <= 1 || e.button !== 0) return;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    const next = clampPan(panRef.current.x + dx, panRef.current.y + dy, zoomRef.current);
    panRef.current = next;
    setPan(next);
  };

  const endDrag = () => setDragging(false);

  const onDoubleClick = () => {
    if (zoomRef.current > 1) applyZoom(1);
    else applyZoom(2);
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="group/zoom relative block h-full w-full cursor-zoom-in"
        aria-label={`Ampliar imagen de ${title ?? 'espacio'}`}
      >
        {trigger}
        <span className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover/zoom:opacity-100">
          <Expand className="h-3.5 w-3.5 text-[#e3bd74]" />
          <span>Ampliar</span>
        </span>
      </button>

      {open &&
        createPortal(
          <div
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md transition-opacity duration-200 sm:p-6 ${
              visible ? 'opacity-100' : 'opacity-0'
            }`}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={title ?? 'Imagen ampliada'}
        >
          <div
            className={`relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#141013] shadow-[0_32px_120px_rgba(0,0,0,0.8)] transition-all duration-200 ${
              visible ? 'scale-100 translate-y-0' : 'scale-[0.97] translate-y-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.03] px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold uppercase tracking-wide text-white">
                  {title ?? 'Vista ampliada'}
                </p>
                {subtitle ? (
                  <p className="truncate text-xs text-white/55">{subtitle}</p>
                ) : (
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#e3bd74]/90">
                    Toca fuera o pulsa ESC para cerrar
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={zoomOut}
                  disabled={zoom <= 1}
                  className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Reducir zoom"
                >
                  <ZoomOut className="h-4.5 w-4.5" />
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={zoom >= 3}
                  className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Aumentar zoom"
                >
                  <ZoomIn className="h-4.5 w-4.5" />
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  disabled={zoom === 1}
                  className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Restablecer zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <span className="mx-1 h-5 w-px bg-white/15" />
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-[#7a1f3d] hover:text-white"
                  aria-label="Cerrar"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Imagen arrastrable */}
            <div
              ref={viewportRef}
              className={`relative min-h-[320px] w-full flex-1 touch-none overflow-hidden bg-black select-none ${
                zoom > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
              }`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerLeave={endDrag}
              onDoubleClick={onDoubleClick}
              onClick={zoom <= 1 ? () => applyZoom(2) : undefined}
            >
              <div
                className="relative mx-auto h-[62vh] w-full sm:h-[70vh]"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: dragging ? 'none' : 'transform 200ms ease-out',
                }}
              >
                <NextImage
                  src={src}
                  alt={title ?? 'Imagen del espacio'}
                  fill
                  sizes="(max-width: 768px) 100vw, 80vw"
                  quality={90}
                  priority
                  className="pointer-events-none object-contain"
                  draggable={false}
                />
              </div>
              {zoom > 1 && !dragging && (
                <span className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/85 backdrop-blur-md">
                  <Move className="h-3.5 w-3.5 text-[#e3bd74]" />
                  <span>Arrastra para moverte</span>
                </span>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 border-t border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs text-white/55">
                {zoom > 1 ? (
                  <>Zoom {Math.round(zoom * 100)}% — arrastra con el mouse o el dedo para moverte · doble clic para restablecer</>
                ) : (
                  <>Acercá con los controles, doble clic o clic en la imagen · luego arrastra para moverte</>
                )}
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={src}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-white/85 transition-colors hover:border-[#e3bd74] hover:text-[#e3bd74]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Descargar</span>
                </a>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl bg-[#7a1f3d] px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#8f2547]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
