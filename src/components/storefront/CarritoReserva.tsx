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

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  /** Inicio de la franja, para ordenar la agenda. */
  etiquetaHora: string;
  /** Fin de la franja. La franja siempre es de 1 hora y hay que mostrar el
   *  rango completo: si solo se muestra la hora de arranque, el cliente no sabe
   *  hasta cuándo puede entrar. */
  etiquetaFin: string;
  precioHora: number;
  /**
   * Cuántas personas entran por ESTA puerta. No es un valor único del carrito:
   * se puede ir solo a una zona y con amigos a otra.
   */
  personas: number;
  /**
   * Índices del grupo que asisten a esta zona. 0 es el titular. Es lo que
   * decide a qué puertas lleva QR cada persona.
   */
  asistentes: number[];
};

export type Acompanante = { fullName: string; document: string };

/** Datos de las personas que acompañan al titular. */
export type Acompanantes = Acompanante[];

type CarritoCtx = {
  bloques: BloqueCarrito[];
  /** Tamaño del grupo completo: titular + acompañantes. */
  personas: number;
  zonasUnicas: number;
  /** Suma por zona de (precio x personas de esa zona). */
  totalCop: number;
  /** Datos ya escritos de los acompañantes, para que sobrevivan al login. */
  acompanantes: Acompanantes;
  /** Si hay sesión. Lo pasa el layout, que es servidor. */
  haySesion: boolean;
  agregar: (
    b: Omit<BloqueCarrito, 'clave' | 'personas' | 'asistentes'> &
      Partial<Pick<BloqueCarrito, 'personas' | 'asistentes'>>,
  ) => { ok: true } | { ok: false; message: string };
  quitar: (clave: string) => void;
  vaciar: () => void;
  setPersonas: (n: number) => void;
  /** Cambia cuántas personas entran por una zona concreta. */
  setPersonasZona: (clave: string, n: number) => void;
  /** Marca o desmarca a una persona del grupo para una zona. */
  alternarAsistente: (clave: string, indice: number) => void;
  /** Escribe el nombre o el documento de un acompañante. */
  escribirAcompanante: (i: number, campo: 'fullName' | 'document', valor: string) => void;
  yaEsta: (slotId: string) => boolean;
  /**
   * Abrir y cerrar el modal del carrito. Lo disparan el botón del navbar y el
   * botón flotante, por eso vive acá y no en un componente.
   */
  abrirCarrito: () => void;
  cerrarCarrito: () => void;
  carritoAbierto: boolean;
};

const Contexto = createContext<CarritoCtx | null>(null);

export function useCarrito(): CarritoCtx {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useCarrito se usó fuera de CarritoProvider");
  return ctx;
}

const CLAVE_ALMACEN = 'omega.carrito.v1';

type EstadoGuardado = {
  bloques: BloqueCarrito[];
  personas: number;
  acompanantes: Acompanantes;
  /** Momento del último guardado, para poder caducar los datos personales. */
  guardadoEn: number;
  /** A qué cuenta pertenece este carrito. Cambia al hacer logout o entrar otro. */
  usuarioId: string;
};

/**
 * El carrito vive en sessionStorage, no solo en memoria.
 *
 * Sin esto, al pedir el inicio de sesión el navegador hace una navegación
 * completa, React desmonta el provider y el cliente vuelve del login con el
 * carrito vacío: pierde las zonas elegidas y tiene que escribirlos de nuevo.
 *
 * Y ADEMÁS guarda nombres y documentos de terceros, así que el sitio donde se
 * guarden importa tanto como cuánto tiempo:
 *
 *  - sessionStorage, no localStorage. Sobrevive a la navegación del login
 *    porque es la misma pestaña, pero desaparece al cerrarla y no se comparte
 *    entre pestañas. En un equipo compartido el siguiente usuario no lo ve.
 *  - Caduca a las dos horas aunque la pestaña siga abierta.
 *  - Se borra al confirmar la reserva, cuando ya está en "Mis reservas".
 *  - Va amarrado al usuario: si alguien cierra sesión y entra otra cuenta en la
 *    misma pestaña, el carrito anterior se descarta en vez de mostrarle a la
 *    cuenta nueva los documentos de la anterior.
 */
const CADUCIDAD_CARRITO_MS = 2 * 60 * 60 * 1000;

/**
 * Identifica a quién pertenece el carrito guardado. Se compara al leer: una
 * clave distinta significa que la cuenta cambió y lo guardado no le pertenece
 * a quien está ahora.
 */
function idUsuarioAnonimo(): string {
  return 'anonimo';
}

function leerGuardado(usuarioId: string): EstadoGuardado | null {
  if (typeof window === 'undefined') return null;
  try {
    const crudo = window.sessionStorage.getItem(CLAVE_ALMACEN);
    if (!crudo) return null;
    const dato = JSON.parse(crudo) as Partial<EstadoGuardado> & { usuarioId?: string };
    if (!Array.isArray(dato.bloques) || dato.bloques.length === 0) return null;

    // El carrito es de otra cuenta. Se borra: no se lo mostramos a este
    // usuario ni lo dejamos disponible para cuando vuelva la anterior.
    if ((dato.usuarioId ?? idUsuarioAnonimo()) !== usuarioId) {
      window.sessionStorage.removeItem(CLAVE_ALMACEN);
      return null;
    }

    // Vencido: se borra en el acto, no solo se ignora. Así los datos personales
    // no quedan ahí esperando a que alguien vuelva a abrir el sitio.
    const guardadoEn = Number(dato.guardadoEn ?? 0);
    if (!guardadoEn || Date.now() - guardadoEn > CADUCIDAD_CARRITO_MS) {
      window.sessionStorage.removeItem(CLAVE_ALMACEN);
      return null;
    }

    return {
      bloques: dato.bloques,
      personas: Math.max(1, Number(dato.personas ?? 1)),
      acompanantes: Array.isArray(dato.acompanantes) ? dato.acompanantes : [],
      guardadoEn,
      usuarioId,
    };
  } catch {
    return null;
  }
}

function guardar(estado: EstadoGuardado | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!estado || estado.bloques.length === 0) {
      window.sessionStorage.removeItem(CLAVE_ALMACEN);
      return;
    }
    // La ventana de dos horas se renueva en cada cambio: mientras el cliente
    // sigue usando el carrito no se le corta la mitad.
    window.sessionStorage.setItem(
      CLAVE_ALMACEN,
      JSON.stringify({ ...estado, guardadoEn: Date.now() }),
    );
  } catch {
    // Modo privado o cuota llena: el carrito sigue funcionando en memoria.
  }
}

/**
 * Vacía el carrito del navegador. Se llama al confirmar la reserva y al cerrar
 * sesión, para no dejar datos personales de una cuenta en una pestaña que
 * puede usar otra.
 */
export function borrarCarritoGuardado() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(CLAVE_ALMACEN);
  } catch {
    // Si no se puede borrar, el vencimiento lo limpia igual.
  }
}

export function CarritoProvider({
  children,
  precioPorDefecto = 0,
  haySesion = true,
  usuarioId = null,
}: {
  children: React.ReactNode;
  precioPorDefecto?: number;
  /** Lo inyecta el layout, que es un componente servidor con la sesión. */
  haySesion?: boolean;
  /**
   * Identifica la cuenta abierta. El carrito guardado se amarra a este id: si
   * cambia (login, logout, otra persona en la misma pestaña) lo guardado se
   * descarta en vez de mostrárselo a quien no corresponde.
   */
  usuarioId?: string | null;
}) {
  // Sin sesión el carrito es de la sesión anónima: sirve para armar el pedido y
  // arrancar el login, no para guardar datos de una cuenta concreta.
  const propietario = usuarioId ?? idUsuarioAnonimo();
  // `hidratado` evita el desajuste de React 18+: el servidor no tiene
  // localStorage, así que el primer render debe salir vacío y recién después
  // se recupera lo guardado.
  const [hidratado, setHidratado] = useState(false);
  const [bloques, setBloques] = useState<BloqueCarrito[]>([]);
  const [personas, setPersonasState] = useState(1);
  const [acompanantes, setAcompanantes] = useState<Acompanantes>([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  const todos = useMemo(
    () => Array.from({ length: personas }, (_, i) => i),
    [personas],
  );

  // Recuperar lo guardado una sola vez, al montar.
  //
  // Sincronizar con sessionStorage es leer una fuente externa, no derivar
  // estado: el servidor no tiene `window`, así que esto no se puede hacer en el
  // render.
  useEffect(() => {
    const guardado = leerGuardado(propietario);
    if (guardado) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- ver la nota de arriba */
      setBloques(guardado.bloques);
      setPersonasState(guardado.personas);
      setAcompanantes(guardado.acompanantes);
    }
    setHidratado(true);
  }, [propietario]);

  // Guardar en cada cambio, ya montado. Antes de hidratar no se escribe nada:
  // si no, el primer efecto pisaría lo guardado con un carrito vacío.
  useEffect(() => {
    if (!hidratado) return;
    guardar(
      bloques.length
        ? { bloques, personas, acompanantes, guardadoEn: Date.now(), usuarioId: propietario }
        : null,
    );
  }, [hidratado, bloques, personas, acompanantes, propietario]);

  /** Escribe el nombre o el documento de un acompañante. */
  const escribirAcompanante = useCallback(
    (i: number, campo: 'fullName' | 'document', valor: string) => {
      setAcompanantes((prev) => {
        const faltan = Math.max(0, personas - 1);
        const base = prev.slice(0, faltan);
        while (base.length < faltan) base.push({ fullName: '', document: '' });
        base[i] = { ...base[i], [campo]: valor };
        return base;
      });
    },
    [personas],
  );

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
      // Una zona nueva entra con el grupo completo por defecto: es lo más común
      // y el cliente puede desmarcar a quien no vaya a esa puerta.
      const asistentes = b.asistentes ?? todos;
      const personasZona = b.personas ?? asistentes.length;
      const bloque = {
        ...b,
        clave,
        precioHora: b.precioHora || precioPorDefecto,
        asistentes,
        personas: personasZona,
      };
      setBloques((prev) =>
        [...prev, bloque].sort((x, y) =>
          `${x.fecha}${x.etiquetaHora}`.localeCompare(`${y.fecha}${y.etiquetaHora}`),
        ),
      );
      return { ok: true };
    },
    [bloques, todos, precioPorDefecto],
  );

  const quitar = useCallback((clave: string) => {
    setBloques((prev) => prev.filter((b) => b.clave !== clave));
  }, []);

  const vaciar = useCallback(() => {
    setBloques([]);
    setPersonasState(1);
    setAcompanantes([]);
    guardar(null);
  }, []);

  // El grupo es el máximo de personas de cualquier zona: es el titular más los
  // acompañantes que se hayan registrado.
  const setPersonas = useCallback((n: number) => {
    const nuevo = Math.min(50, Math.max(1, Math.floor(n)));
    setPersonasState(nuevo);
    // Crecer el grupo mete a los nuevos en todas las zonas que ya tenían a todo
    // el grupo; reducirlo saca a los que ya no existen del grupo.
    setBloques((prev) =>
      prev.map((b) => {
        const validos = b.asistentes.filter((i) => i < nuevo);
        return validos.length === 0
          ? { ...b, asistentes: [0], personas: 1 }
          : { ...b, asistentes: validos, personas: validos.length };
      }),
    );
  }, []);

  /** Cambia cuántas personas entran por una zona: agrega o quita por el final. */
  const setPersonasZona = useCallback((clave: string, n: number) => {
    setBloques((prev) =>
      prev.map((b) => {
        if (b.clave !== clave) return b;
        const objetivo = Math.min(personas, Math.max(1, Math.floor(n)));
        let asistentes = [...b.asistentes];
        while (asistentes.length < objetivo) {
          const siguiente = asistentes.length;
          if (asistentes.includes(siguiente)) {
            // Ya están todos los del grupo: no se pueden sumar más.
            if (siguiente >= personas) break;
            const libre = Array.from({ length: personas }, (_, i) => i).find(
              (i) => !asistentes.includes(i),
            );
            if (libre === undefined) break;
            asistentes.push(libre);
          } else {
            asistentes.push(siguiente);
          }
        }
        asistentes = asistentes.slice(0, objetivo).sort((a, c) => a - c);
        return { ...b, asistentes, personas: asistentes.length };
      }),
    );
  }, [personas]);

  /** Marca o desmarca a una persona del grupo para una zona concreta. */
  const alternarAsistente = useCallback((clave: string, indice: number) => {
    setBloques((prev) =>
      prev.map((b) => {
        if (b.clave !== clave) return b;
        const marcados = b.asistentes.includes(indice);
        if (marcados && b.asistentes.length === 1) return b;
        const asistentes = marcados
          ? b.asistentes.filter((i) => i !== indice)
          : [...b.asistentes, indice].sort((a, c) => a - c);
        return { ...b, asistentes, personas: asistentes.length };
      }),
    );
  }, []);

  const zonasUnicas = useMemo(() => new Set(bloques.map((b) => b.serviceId)).size, [bloques]);
  // El total es por zona: cada persona paga la franja a la que asiste.
  const totalCop = useMemo(
    () => bloques.reduce((s, b) => s + b.precioHora * b.personas, 0),
    [bloques],
  );

  const abrirCarrito = useCallback(() => setCarritoAbierto(true), []);
  const cerrarCarrito = useCallback(() => setCarritoAbierto(false), []);

  const valor: CarritoCtx = {
    bloques,
    personas,
    zonasUnicas,
    totalCop,
    acompanantes,
    haySesion,
    agregar,
    quitar,
    vaciar,
    setPersonas,
    setPersonasZona,
    alternarAsistente,
    escribirAcompanante,
    yaEsta,
    abrirCarrito,
    cerrarCarrito,
    carritoAbierto,
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
): Omit<BloqueCarrito, 'clave' | 'personas' | 'asistentes'> {
  return {
    serviceId: servicio.id,
    serviceName: servicio.name,
    categoryName: servicio.category.name,
    slotId: slot.id,
    fecha,
    etiquetaHora: slot.startsAt instanceof Date ? slot.startsAt.toISOString() : String(slot.startsAt),
    etiquetaFin: slot.endsAt instanceof Date ? slot.endsAt.toISOString() : String(slot.endsAt),
    precioHora: servicio.price,
  };
}
