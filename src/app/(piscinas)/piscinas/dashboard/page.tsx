'use client';

import Link from 'next/link';
import {
  Calendar,
  Users,
  DollarSign,
  Activity,
  QrCode,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Eye,
  Sparkles,
  Waves,
} from 'lucide-react';

export default function DashboardPage() {
  const stats = [
    {
      title: 'Total Reservas',
      value: '1,247',
      change: '+14.2%',
      trend: 'up',
      subtitle: 'Este mes en todas las áreas',
      icon: Calendar,
      color: 'bg-blue-50 text-blue-700 border-blue-100',
      badgeColor: 'text-blue-600 bg-blue-100/60',
    },
    {
      title: 'Ingresos Netos',
      value: '$12,540,000',
      change: '+8.5%',
      trend: 'up',
      subtitle: 'COP liquidados en plataforma',
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      badgeColor: 'text-emerald-600 bg-emerald-100/60',
    },
    {
      title: 'Usuarios Activos',
      value: '243',
      change: '+22 nuevos',
      trend: 'up',
      subtitle: 'Clientes con reservas este mes',
      icon: Users,
      color: 'bg-amber-50 text-amber-700 border-amber-100',
      badgeColor: 'text-amber-600 bg-amber-100/60',
    },
    {
      title: 'Ocupación de Aforo',
      value: '78%',
      change: 'Horas pico',
      trend: 'neutral',
      subtitle: 'Capacidad promedio en fin de semana',
      icon: Activity,
      color: 'bg-rose-50 text-rose-700 border-rose-100',
      badgeColor: 'text-rose-600 bg-rose-100/60',
    },
  ];

  const facilities = [
    {
      name: 'Piscina de Olas',
      category: 'Acuático',
      capacity: '75 / 100',
      percent: 75,
      status: 'Normal',
      statusColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      name: 'Cancha de Fútbol 11 (Césped)',
      category: 'Canchas',
      capacity: '22 / 22',
      percent: 100,
      status: 'Completo',
      statusColor: 'bg-rose-100 text-rose-800',
    },
    {
      name: 'Pista de Pádel Panorámica',
      category: 'Canchas',
      capacity: '4 / 4',
      percent: 100,
      status: 'En juego',
      statusColor: 'bg-rose-100 text-rose-800',
    },
    {
      name: 'Zona Húmeda (Sauna & Turco)',
      category: 'Bienestar',
      capacity: '8 / 15',
      percent: 53,
      status: 'Disponible',
      statusColor: 'bg-blue-100 text-blue-800',
    },
    {
      name: 'Gimnasio Equipado',
      category: 'Fitness',
      capacity: '18 / 30',
      percent: 60,
      status: 'Disponible',
      statusColor: 'bg-blue-100 text-blue-800',
    },
  ];

  const recentActivity = [
    {
      id: 1,
      title: 'Nueva reserva confirmada',
      user: 'Carlos Andrés Pérez',
      detail: 'Piscina de Olas • 2 cupos • 14:00 - 15:00',
      time: 'Hace 5 minutos',
      type: 'reservation',
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      id: 2,
      title: 'Acceso QR validado',
      user: 'Mariana Gómez',
      detail: 'Torniquete Principal • Cancha de Pádel',
      time: 'Hace 18 minutos',
      type: 'qr',
      icon: QrCode,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      id: 3,
      title: 'Pago procesado con éxito',
      user: 'Juan David Restrepo',
      detail: 'Monto: $50,000 COP • Microfútbol Sintética',
      time: 'Hace 42 minutos',
      type: 'payment',
      icon: DollarSign,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      id: 4,
      title: 'Nuevo cliente registrado',
      user: 'Valentina Ospina',
      detail: 'Cédula: 1020304050 • Verificación completada',
      time: 'Hace 1 hora',
      type: 'user',
      icon: Users,
      color: 'text-amber-600 bg-amber-50',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7A1F3D]/10 text-[#7A1F3D] text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>Administración General</span>
          </div>
          <h1 className="text-3xl font-black text-[#1F1F1F] tracking-tight">
            Panel de Control
          </h1>
          <p className="text-sm text-[#6B7280]">
            Supervisión en tiempo real de reservas, aforos, accesos QR e ingresos de Omega Complex.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/servicios"
            className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#1F1F1F] hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4 text-[#6B7280]" />
            <span>Ver Catálogo</span>
          </Link>
          <Link
            href="/mis-reservas"
            className="px-4 py-2.5 rounded-xl bg-[#7A1F3D] hover:bg-[#631730] text-white text-sm font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4 text-[#C8A96B]" />
            <span>Gestionar Reservas</span>
          </Link>
        </div>
      </div>

      {/* Tarjetas de Métricas (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs hover:border-[#7A1F3D]/40 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  {stat.title}
                </span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#1F1F1F]">
                    {stat.value}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${stat.badgeColor}`}>
                    {stat.change}
                  </span>
                </div>
                <p className="text-xs text-[#9CA3AF] font-medium">
                  {stat.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contenido Principal en 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Monitoreo de Aforos e Instalaciones */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-[#E5E7EB] shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#1F1F1F] flex items-center gap-2">
                <Waves className="w-5 h-5 text-[#7A1F3D]" />
                <span>Aforo en Vivo por Instalación</span>
              </h2>
              <p className="text-xs text-[#6B7280]">
                Ocupación instantánea y capacidad máxima autorizada.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              En vivo
            </span>
          </div>

          <div className="space-y-4">
            {facilities.map((fac, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#F3F4F6] space-y-2.5 hover:border-[#E5E7EB] transition-colors"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#1F1F1F] block">{fac.name}</span>
                    <span className="text-xs text-[#6B7280]">{fac.category}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${fac.statusColor}`}>
                      {fac.status}
                    </span>
                    <span className="block text-xs font-semibold text-[#1F1F1F] mt-1">
                      {fac.capacity} personas
                    </span>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      fac.percent >= 90
                        ? 'bg-rose-500'
                        : fac.percent >= 70
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${fac.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-right">
            <Link
              href="/servicios"
              className="text-xs font-bold text-[#7A1F3D] hover:underline inline-flex items-center gap-1"
            >
              <span>Ver todas las 16 instalaciones</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Columna Derecha: Actividad Reciente & Accesos QR */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E5E7EB] shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#1F1F1F] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#7A1F3D]" />
              <span>Actividad Reciente</span>
            </h2>
            <p className="text-xs text-[#6B7280]">
              Últimas transacciones y validaciones registradas en el sistema.
            </p>
          </div>

          <div className="space-y-4">
            {recentActivity.map((act) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="flex items-start gap-3 pb-4 border-b border-[#F3F4F6] last:border-b-0 last:pb-0">
                  <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${act.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1F1F1F] truncate">
                      {act.title}
                    </p>
                    <p className="text-xs font-semibold text-[#7A1F3D]">
                      {act.user}
                    </p>
                    <p className="text-[11px] text-[#6B7280] leading-snug">
                      {act.detail}
                    </p>
                    <span className="text-[10px] text-[#9CA3AF] block font-medium">
                      {act.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Banner de Validación QR */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#7A1F3D] to-[#551429] text-white space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#C8A96B]">
              <QrCode className="w-4 h-4" />
              <span>Validación Rápida</span>
            </div>
            <p className="text-xs text-white/90">
              Escanea boletos en puerta para registrar accesos y validar reglas de vestimenta obligatoria.
            </p>
            <div className="pt-1">
              <button
                onClick={() => alert('Módulo de escáner QR listo para conectar lector físico o cámara.')}
                className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Abrir Escáner QR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
