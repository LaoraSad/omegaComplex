"use client";

import Link from 'next/link';
import { Pool } from '@/types/piscinas/pool';

interface PoolCardProps {
  pool: Pool;
}

const STARS = [1, 2, 3, 4, 5];

import PanoramaClient from './PanoramaClient';

export default function PoolCard({ pool }: PoolCardProps) {
  return (
    <Link
      href={`/tour/${pool.id}`}
      className="group relative flex flex-col rounded-[28px] overflow-hidden bg-white/[0.03] backdrop-blur-3xl border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.3)] saturate-150 hover:bg-white/[0.06] hover:border-rose-500/30 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_40px_rgba(244,63,94,0.15)] transition-all duration-300 hover:-translate-y-1"
    >
      {/* Thumbnail */}
      <div className="relative h-52 overflow-hidden bg-[#0d0204]">
        <div className="w-full h-full pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity">
          <PanoramaClient src={pool.panoramaUrl} hideHud />
        </div>
        {/* 360° badge */}
        <div className="absolute top-4 right-4 bg-white/[0.1] backdrop-blur-md border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] rounded-full px-3 py-1 text-xs font-bold text-white flex items-center gap-1">
          <span className="text-rose-400">●</span> 360°
        </div>
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
        {/* Location */}
        <p className="absolute bottom-4 left-4 text-xs font-medium text-white/90 flex items-center gap-1 drop-shadow-md">
          📍 {pool.location}
        </p>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col gap-4 flex-1">
        {/* Title & stars */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-white font-bold text-lg leading-tight tracking-tight drop-shadow-sm">{pool.name}</h3>
          <div className="flex shrink-0">
            {STARS.map((s) => (
              <span key={s} className={s <= pool.rating ? 'text-yellow-400 drop-shadow-md' : 'text-white/20'}>
                ★
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        <p className="text-white/70 text-sm leading-relaxed line-clamp-2">{pool.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {pool.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-medium px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-auto pt-5 flex items-center justify-between border-t border-white/5">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 group-hover:text-rose-300 transition-colors">
            Ver tour
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </span>
          <button 
            className="px-5 py-2.5 bg-gradient-to-r from-red-600/90 to-rose-600/90 hover:from-red-500 hover:to-rose-500 border border-rose-400/30 shadow-[0_4px_16px_rgba(225,29,72,0.35)] text-white text-sm font-bold rounded-2xl transition-all z-10 relative active:scale-95"
            onClick={(e) => {
              e.preventDefault();
              alert(`¡Has seleccionado reservar ${pool.name} por $${new Intl.NumberFormat('es-CO').format(pool.price || 0)} COP! Redirigiendo a pasarela de pago...`);
            }}
          >
            Reservar - ${pool.price ? new Intl.NumberFormat('es-CO').format(pool.price) : '0'} COP
          </button>
        </div>
      </div>
    </Link>
  );
}
