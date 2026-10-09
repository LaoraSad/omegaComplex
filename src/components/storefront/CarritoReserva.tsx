'use client';

// ---------------------------------------------------------------------------
// Carrito de reserva: varias zonas en un solo pedido.
//
// El estado vive aqui y no en cada tarjeta, asi que la barra flotante y el
// selector de franjas leen la misma lista. Una zona = una franja.
//
// Las personas van a todas las zonas, asi que `personas` es global al carrito y
// no por bloque: el total es la suma de cada franja por esas personas.
// ---------------------------------------------------------------------------

import { useCallback, useMemo, useState } from 'react';
import { createContext, useContext } from 'react';
import type { DayAvailability } from '@/features/availability/availability.types';

export type BloqueCarrito = {
  /** Clave estable para React y para quitar duplicados. */
  clave: string;
  serviceId: string;
  serviceName: string;
  categoryName: string;
  slotId: string;
  fecha: string;
  /** Franja ya formateada para mostrar, tal cual la devuelve la disponibilidad. */
  etiquetaHora: string;
  precioHora: number;
  /** Si el bloqueo anterior venció, este bloque queda marcado para revisa. */
};

type CarritoCtx = {
  bloques: BloqueCarrito[];
  personas: number;
  /** installations repetidas, para avisar que no se puede volver a agregar. */
  zonasUnicas: number;
  totalCop: number;
  agregar: (b: Omit<BloqueCarrito, 'clave'>) => { ok: true } | { ok: false; message: string };
  quitar: (clave: string) => void;
  vaciar: () => void;
  setPersonas: (n: number) => void;
  yaEsta: (slotId: string) => boolean;
};

const Contexto = createContext<CarritoCtx | null>(null);

export function useCarrito(): CarritoCtx {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useCarrito se usó fuera de CarritoProvider");
  return ctx;
}

export function CarritoProvider({
  children,
  precioPorDefecto = 0,
}: {
  children: React.ReactNode;
  precioPorDefecto?: number;
}) {
  const [bloques, setBloques] = useState<BloqueCarrito[]>([]);
  const [personas, setPersonasState] = useState(1);

  const yaEsta = useCallback((slotId: string) => bloques.some((b) => b.slotId === slotId), [bloques]);

  // El solape real de franjas lo valida el servidor al confirmar, que es quien
  // tiene la verdad de los cupos. Aqui solo se corta el duplicado obvio, para
  // que un doble clic no sume dos veces la misma franja.
  const agregar = useCallback<CarritoCtx['agregar']>(
    (b) => {
      if (bloques.some((x) => x.slotId === b.slotId)) {
        return { ok: false, message: 'Esa franja ya está en tu carrito.' };
      }
      const clave = `${b.serviceId}|${b.slotId}`;
      const bloque = { ...b, clave, precioHora: b.precioHora || precioPorDefecto };
      setBloques((prev) =>
        [...prev, bloque].sort((x, y) =>
          `${x.fecha}${x.etiquetaHora}`.localeCompare(`${y.fecha}${y.etiquetaHora}`),
        ),
      );
      return { ok: true };
    },
    [bloques, precioPorDefecto],
  );

  const quitar = useCallback((clave: string) => {
    setBloques((prev) => prev.filter((b) => b.clave !== clave));
  }, []);

  const vaciar = useCallback(() => {
    setBloques([]);
    setPersonasState(1);
  }, []);

  const setPersonas = useCallback((n: number) => {
    setPersonasState(Math.min(50, Math.max(1, Math.floor(n))));
  }, []);

  const zonasUnicas = useMemo(() => new Set(bloques.map((b) => b.serviceId)).size, [bloques]);
  const totalCop = useMemo(
    () => bloques.reduce((s, b) => s + b.precioHora * personas, 0),
    [bloques, personas],
  );

  const valor: CarritoCtx = {
    bloques,
    personas,
    zonasUnicas,
    totalCop,
    agregar,
    quitar,
    vaciar,
    setPersonas,
    yaEsta,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

// ---------------------------------------------------------------------------

export function formatoHora(d: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Bogota',
  }).format(new Date(d));
}

export function fechaCorta(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
}

export function cop(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

/** Convierte una franja de la disponibilidad en un bloque agregable. */
export function bloqueDesdeSlot(
  servicio: { id: string; name: string; category: { name: string }; price: number },
  slot: DayAvailability['slots'][number],
  fecha: string,
): Omit<BloqueCarrito, 'clave'> {
  return {
    serviceId: servicio.id,
    serviceName: servicio.name,
    categoryName: servicio.category.name,
    slotId: slot.id,
    fecha,
    etiquetaHora: slot.startsAt instanceof Date ? slot.startsAt.toISOString() : String(slot.startsAt),
    precioHora: servicio.price,
  };
}