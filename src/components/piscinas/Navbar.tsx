'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/[0.02] backdrop-blur-3xl border-b border-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.3)] saturate-150">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/piscinas/inicio" className="flex items-center gap-2 font-bold text-lg text-white">
          <span className="text-2xl drop-shadow-md">🏊</span>
          <span className="bg-gradient-to-r from-rose-300 via-red-400 to-rose-400 bg-clip-text text-transparent drop-shadow-lg font-extrabold tracking-tight">
            OmegaComplex
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6 text-sm text-white/80 font-medium">
          <Link href="/piscinas/inicio" className="hover:text-rose-300 transition-colors drop-shadow-md">Inicio</Link>
          <Link href="/tour/infinity" className="hover:text-rose-300 transition-colors drop-shadow-md">Infinity</Link>
          <Link href="/tour/indoor" className="hover:text-rose-300 transition-colors drop-shadow-md">Spa Termal</Link>
          <Link href="/tour/sauna" className="hover:text-rose-300 transition-colors drop-shadow-md">Sauna</Link>
          <a
            href="/api/pools"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-white/[0.05] border border-rose-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] text-white hover:bg-rose-500/15 hover:border-rose-500/40 hover:text-rose-200 transition-all"
          >
            API JSON
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-white p-2"
          aria-label="Menú"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white/[0.02] backdrop-blur-3xl border-t border-white/[0.1] px-4 py-4 flex flex-col gap-3 text-sm text-white/90">
          <Link href="/piscinas/inicio" onClick={() => setOpen(false)} className="hover:text-rose-300">Inicio</Link>
          <Link href="/tour/infinity" onClick={() => setOpen(false)} className="hover:text-rose-300">Piscina Infinity</Link>
          <Link href="/tour/indoor" onClick={() => setOpen(false)} className="hover:text-rose-300">Spa Termal</Link>
          <Link href="/tour/sauna" onClick={() => setOpen(false)} className="hover:text-rose-300">Sauna Moderno</Link>
          <a href="/api/pools" target="_blank" className="text-rose-300">API JSON</a>
        </div>
      )}
    </nav>
  );
}
