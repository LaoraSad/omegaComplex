'use client';

// Botón de carrito para el navbar.
//
// Existe porque la barra inferior no acompaña al navegar: si el cliente va de
// una atracción a otra, la barra desaparece y con ella la forma de ver lo que
// já tenía elegido. Este botón vive en el navbar y el carrito vive en el layout,
// así que las dos rutas comparten el mismo estado.

import { ShoppingBag } from 'lucide-react';
import { cop, useCarrito } from './CarritoReserva';

export function BotonCarrito({ className = '' }: { className?: string }) {
  const { bloques, totalCop, abrirCarrito } = useCarrito();

  // Sin nada elegido no vale la pena mostrarlo: sería un botón que no hace nada.
  if (bloques.length === 0) return null;

  return (
    <button
      type="button"
      onClick={abrirCarrito}
      className={`relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/5 cursor-pointer ${className}`}
    >
      <ShoppingBag className="h-5 w-5 text-[#d9b56c]" />
      <span className="hidden sm:inline">Carrito</span>
      <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#7a1f3d] px-1 text-[11px] font-black text-white">
        {bloques.length}
      </span>
      <span className="sr-only">
        Ver carrito: {bloques.length} zonas, total {cop(totalCop)}
      </span>
    </button>
  );
}