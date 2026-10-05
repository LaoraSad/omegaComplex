import Link from 'next/link';
import { QrCode, Clock, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#E5E7EB] text-[#1F1F1F] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#E5E7EB]">
          {/* Columna 1: Branding */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#7A1F3D] text-white flex items-center justify-center font-black text-lg">
                Ω
              </div>
              <span className="font-extrabold text-lg tracking-tight text-[#1F1F1F]">
                OMEGA <span className="text-[#7A1F3D]">COMPLEX</span>
              </span>
            </div>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              Plataforma digital para la gestión de reservas, actividades deportivas y control de acceso con código QR seguro.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F5F5] border border-[#E5E7EB] text-xs text-[#7A1F3D] font-semibold">
              <QrCode className="w-4 h-4 text-[#7A1F3D]" />
              <span>Acceso 100% digital con QR</span>
            </div>
          </div>

          {/* Columna 2: Categorías */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm tracking-wide uppercase text-[#1F1F1F]">
              Instalaciones
            </h4>
            <ul className="space-y-2 text-sm text-[#6B7280]">
              <li>
                <Link href="/servicios?categoria=cat-piscinas" className="hover:text-[#7A1F3D] transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-[#C8A96B]" />
                  <span>Piscinas & Olas</span>
                </Link>
              </li>
              <li>
                <Link href="/servicios?categoria=cat-canchas" className="hover:text-[#7A1F3D] transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-[#C8A96B]" />
                  <span>Canchas de Fútbol y Polideportivos</span>
                </Link>
              </li>
              <li>
                <Link href="/servicios?categoria=cat-gimnasio" className="hover:text-[#7A1F3D] transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-[#C8A96B]" />
                  <span>Gimnasio Equipado</span>
                </Link>
              </li>
              <li>
                <Link href="/servicios?categoria=cat-zona-humeda" className="hover:text-[#7A1F3D] transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-[#C8A96B]" />
                  <span>Zona Húmeda (Sauna y Turco)</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Horarios y Mantenimiento */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm tracking-wide uppercase text-[#1F1F1F] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#7A1F3D]" />
              <span>Horario del Complejo</span>
            </h4>
            <div className="space-y-2 text-sm text-[#6B7280]">
              <p className="flex justify-between border-b border-[#F5F5F5] pb-1">
                <span>Martes a Domingo:</span>
                <span className="font-semibold text-[#1F1F1F]">08:00 – 17:00</span>
              </p>
              <p className="flex justify-between border-b border-[#F5F5F5] pb-1">
                <span>Lunes:</span>
                <span className="font-semibold text-[#7A1F3D]">Cerrado (Mantenimiento)</span>
              </p>
              <p className="text-xs text-[#6B7280] pt-1">
                * Si el lunes es festivo, el mantenimiento se realiza el día martes.
              </p>
            </div>
          </div>

          {/* Columna 4: Normativa & Contacto */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm tracking-wide uppercase text-[#1F1F1F] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#7A1F3D]" />
              <span>Normas y Reglas</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-[#6B7280]">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#7A1F3D] shrink-0 mt-0.5" />
                <span>Piscinas: Obligatorio uso de licras y gorro.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#7A1F3D] shrink-0 mt-0.5" />
                <span>Gimnasio: Mayores de 12 años, no ingresar mojado, calzado deportivo.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#7A1F3D] shrink-0 mt-0.5" />
                <span>Reservas cobradas por hora con anticipación máx. 3 meses.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#7A1F3D] shrink-0 mt-0.5" />
                <span>Presentación de código QR único por entrada al ingresar.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
          <p>© {new Date().getFullYear()} Omega Complex. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link href="/informacion" className="hover:text-[#7A1F3D] transition-colors">
              Información de acceso
            </Link>
            <Link href="/servicios" className="hover:text-[#7A1F3D] transition-colors">
              Catálogo de servicios
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
