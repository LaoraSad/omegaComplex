'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import PanoramaClient from '@/components/tour/PanoramaClient';

interface PanoramaModalProps {
  src: string;
  title?: string;
  trigger: React.ReactNode;
}

export default function PanoramaModal({ src, title, trigger }: PanoramaModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full h-full cursor-pointer" aria-label={`Ver 360° de ${title ?? 'espacio'}`}>
        {trigger}
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-5xl bg-black rounded-2xl border border-white/15 shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white font-bold text-sm truncate">{title ?? 'Vista 360°'}</span>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full h-[70vh] sm:h-[75vh] md:h-[78vh] flex-1 min-h-[320px]">
              <PanoramaClient src={src} caption={title} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
