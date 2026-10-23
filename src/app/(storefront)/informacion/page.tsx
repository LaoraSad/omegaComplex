import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Ban,
  Clock,
  Hourglass,
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react";

import { listCatalogServices } from "@/features/catalog";

export const metadata: Metadata = { title: "Información del complejo" };

/**
 * Guía del usuario.
 *
 * Los aforos salen de Service.capacity, no de un texto fijo: así no se
 * desincronizan cuando el administrador cambia una capacidad. El resto son
 * reglas confirmadas por el cliente (SCRUM: horarios, lunes de mantenimiento,
 * protocolo de QR).
 */

const EMOJI: Record<string, string> = {
  piscinas: "🏊",
  canchas: "⚽",
  gimnasio: "🏋️",
  "zonas-humedas": "🧖",
};

export default async function InfoPage() {
  const services = await listCatalogServices();

  // Agrupar por categoría, conservando el orden que devuelve el repositorio.
  const porCategoria = new Map<string, { nombre: string; slug: string; items: typeof services }>();
  for (const s of services) {
    const actual = porCategoria.get(s.category.slug);
    if (actual) actual.items.push(s);
    else porCategoria.set(s.category.slug, { nombre: s.category.name, slug: s.category.slug, items: [s] });
  }

  return (
    <div className="mega-dark-section relative min-h-screen overflow-hidden bg-[#0e0b0d] text-white">
      <main className="relative mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <header className="space-y-2 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#e3bd74]">
            Guía del usuario
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Información del complejo
          </h1>
          <p className="mx-auto max-w-xl text-sm text-white/60 sm:text-base">
            Todo lo que necesitas saber antes de tu visita: horarios, acceso con QR y aforo de cada
            área.
          </p>
        </header>

        {/* Horarios y mantenimiento */}
        <section className="space-y-5 rounded-2xl border border-white/10 bg-[#141013] p-6 sm:p-8">
          <EncabezadoSeccion
            icono={<Clock className="h-5 w-5" />}
            titulo="Horario general y mantenimiento"
            subtitulo="Operación continua por horas programadas"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#e3bd74]">
                Atención al público
              </span>
              <p className="text-2xl font-black tabular-nums">08:00 – 17:00</p>
              <p className="text-xs text-white/55">
                Abierto de martes a domingo. Las reservas se coordinan en franjas exactas de una
                hora.
              </p>
            </div>
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#e3bd74]">
                Jornada de mantenimiento
              </span>
              <p className="text-2xl font-black uppercase text-[#e3bd74]">Lunes cerrado</p>
              <p className="text-xs text-white/55">
                El complejo permanece cerrado los lunes por mantenimiento técnico. Si el lunes es
                festivo, el mantenimiento se traslada al martes.
              </p>
            </div>
          </div>
        </section>

        {/* Protocolo QR */}
        <section className="space-y-5 rounded-2xl border border-white/10 bg-[#141013] p-6 sm:p-8">
          <EncabezadoSeccion
            icono={<QrCode className="h-5 w-5" />}
            titulo="Protocolo de ingreso con código QR"
            subtitulo="Reglas oficiales de validación y control de acceso"
          />
          <div className="space-y-3 text-sm">
            <Regla icono={<Clock className="h-5 w-5" />} titulo="Ventana de ingreso autorizada">
              Puedes ingresar dentro de tu horario reservado. Si reservaste de 14:00 a 15:00,
              entras a las 14:00, 14:15 o 14:30.
            </Regla>
            <Regla icono={<Ban className="h-5 w-5 text-rose-300" />} titulo="Sin tolerancia posterior">
              No se permite el acceso después de que haya terminado la franja reservada.
            </Regla>
            <Regla icono={<Hourglass className="h-5 w-5 text-amber-300" />} titulo="Llegadas tardías">
              Si llegas tarde dentro de tu franja igual puedes ingresar, pero solo disfrutas del
              tiempo restante. Los horarios no se extienden.
            </Regla>
            <Regla
              icono={<ShieldCheck className="h-5 w-5 text-emerald-300" />}
              titulo="Un código QR por entrada"
            >
              Cada persona tiene un QR individual de un solo uso. Si reservas para acompañantes,
              recibes un código por cada persona.
            </Regla>
          </div>
        </section>

        {/* Aforos, desde la base */}
        <section className="space-y-5 rounded-2xl border border-white/10 bg-[#141013] p-6 sm:p-8">
          <EncabezadoSeccion
            icono={<Users className="h-5 w-5" />}
            titulo="Aforo por instalación"
            subtitulo="Cupos reales de cada área, tomados del sistema"
          />
          {porCategoria.size > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[...porCategoria.values()].map((categoria) => (
                <div
                  key={categoria.slug}
                  className="space-y-2 rounded-xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <span className="block text-sm font-extrabold">
                    {EMOJI[categoria.slug] ?? "📍"} {categoria.nombre}
                  </span>
                  <ul className="space-y-1 text-xs text-white/60">
                    {categoria.items.map((s) => (
                      <li key={s.id} className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate">{s.name}</span>
                        <strong className="shrink-0 tabular-nums text-white/90">
                          {s.capacity}
                        </strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/55">
              Todavía no hay instalaciones cargadas en el sistema.
            </p>
          )}
        </section>

        {/* Cierre */}
        <div className="pt-2 text-center">
          <Link
            href="/servicios"
            className="inline-flex items-center gap-2 rounded-lg bg-[#7a1f3d] px-7 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#631730]"
          >
            Consultar disponibilidad y reservar
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}

function EncabezadoSeccion({
  icono,
  titulo,
  subtitulo,
}: {
  icono: React.ReactNode;
  titulo: string;
  subtitulo: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e3bd74]/25 bg-[#e3bd74]/10 text-[#e3bd74]">
        {icono}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-black uppercase tracking-wide sm:text-xl">{titulo}</h2>
        <p className="text-xs text-white/50">{subtitulo}</p>
      </div>
    </div>
  );
}

function Regla({
  icono,
  titulo,
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <span className="mt-0.5 shrink-0 text-[#e3bd74]">{icono}</span>
      <div className="min-w-0">
        <strong className="block font-bold">{titulo}</strong>
        <p className="mt-0.5 text-xs text-white/60 sm:text-sm">{children}</p>
      </div>
    </div>
  );
}