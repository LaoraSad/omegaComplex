'use client';

import { useState } from 'react';
import { SelectorFranjas } from '@/components/storefront/SelectorFranjas';
import type { CatalogServiceRecord } from '@/features/catalog/catalog.types';

/** Isla cliente del detalle: botón de reserva + modal de franjas.
 * Todo lo demás de la página lo sirve el servidor ya renderizado. */
export default function ReservaIsla({ service }: { service: CatalogServiceRecord }) {
  const [abriendoReserva, setAbriendoReserva] = useState(false);

  return (
    <>
      <aside className="h-fit rounded-xl border border-[#e3bd74]/25 bg-[#141013] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e3bd74]">Reservas</p>
        <h2 className="mt-2 text-xl font-black">Reserva en línea</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Elige la fecha y la franja de una hora, di cuántas personas asistirán y registra a
          los acompañantes. Puedes sumar más zonas al carrito y pagar todo junto.
        </p>
        <button
          type="button"
          onClick={() => setAbriendoReserva(true)}
          className="mt-6 w-full rounded-md border border-[#e3bd74]/50 px-4 py-2.5 text-sm font-bold text-[#e3bd74] transition-colors hover:bg-[#e3bd74]/10"
        >
          Reservar
        </button>
      </aside>

      {abriendoReserva ? (
        <SelectorFranjas servicio={service} onClose={() => setAbriendoReserva(false)} />
      ) : null}
    </>
  );
}
