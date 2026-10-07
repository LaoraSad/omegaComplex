import Link from 'next/link';
import Image from 'next/image';
import { Clock, MapPin, QrCode } from 'lucide-react';
import SectionDivider from '@/components/SectionDivider';

export default function Footer() {
  return (
    <footer id="contacto" className="scroll-mt-20 bg-[#0e0b0d] text-white">
      {/* El divisor ES la línea superior del footer */}
      <SectionDivider />

      <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-14 sm:px-8 lg:px-12 lg:pt-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Marca */}
          <div>
            <Image
              src="/Logo-blanco.png"
              alt="Omega Complex"
              width={220}
              height={61}
              className="h-12 w-auto"
            />
            <p className="mt-5 max-w-[280px] text-[13px] leading-relaxed text-white/60">
              Complejo deportivo y recreativo. Reservas en línea con control de
              acceso digital QR.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 border-t-2 border-[#d9b56c] pt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#e3bd74]">
              <QrCode className="h-4 w-4" />
              <span>Acceso 100% digital con QR</span>
            </p>
          </div>

          {/* Instalaciones */}
          <nav aria-label="Instalaciones">
            <h4 className="border-b border-white/10 pb-3 text-[12px] font-bold uppercase tracking-[0.2em] text-white">
              Instalaciones
            </h4>
            <ul className="mt-4 space-y-3 text-[13px] text-white/60">
              <li>
                <Link href="/servicios?categoria=cat-piscinas" className="transition-colors hover:text-[#e3bd74]">
                  Piscinas y olas
                </Link>
              </li>
              <li>
                <Link href="/servicios?categoria=cat-canchas" className="transition-colors hover:text-[#e3bd74]">
                  Canchas de fútbol y polideportivos
                </Link>
              </li>
              <li>
                <Link href="/servicios?categoria=cat-gimnasio" className="transition-colors hover:text-[#e3bd74]">
                  Gimnasio equipado
                </Link>
              </li>
              <li>
                <Link href="/servicios?categoria=cat-zona-humeda" className="transition-colors hover:text-[#e3bd74]">
                  Zona húmeda · Sauna y turco
                </Link>
              </li>
            </ul>
          </nav>

          {/* Horario */}
          <div>
            <h4 className="flex items-center gap-2 border-b border-white/10 pb-3 text-[12px] font-bold uppercase tracking-[0.2em] text-white">
              <Clock className="h-4 w-4 text-[#e3bd74]" />
              <span>Horario</span>
            </h4>
            <div className="mt-4 space-y-2 text-[13px] text-white/60">
              <p className="flex justify-between gap-4 border-b border-white/10 pb-2">
                <span>Mar – Dom</span>
                <span className="font-bold text-white">08:00 – 17:00</span>
              </p>
              <p className="flex justify-between gap-4 border-b border-white/10 pb-2">
                <span>Lunes</span>
                <span className="font-bold text-[#e3bd74]">Cerrado</span>
              </p>
              <p className="flex items-start gap-1.5 pt-1 text-[12px] leading-relaxed text-white/45">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#e3bd74]" />
                <span>Consulta disponibilidad en tiempo real antes de tu visita.</span>
              </p>
            </div>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="border-b border-white/10 pb-3 text-[12px] font-bold uppercase tracking-[0.2em] text-white">
              Contacto
            </h4>
            <ul className="mt-4 space-y-3 text-[13px] text-white/60">
              <li>
                <Link href="/informacion" className="transition-colors hover:text-[#e3bd74]">
                  Información del complejo
                </Link>
              </li>
              <li>
                <Link href="/servicios" className="transition-colors hover:text-[#e3bd74]">
                  Catálogo y reservas
                </Link>
              </li>
              <li>
                <Link href="/mis-reservas" className="transition-colors hover:text-[#e3bd74]">
                  Mis reservas y QR
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-[#e3bd74]">
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra legal */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-[12px] text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Omega Complex. Todos los derechos reservados.</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">
            Deporte · Bienestar · Comunidad
          </p>
        </div>
      </div>
    </footer>
  );
}
