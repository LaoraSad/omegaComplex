import { LayoutGrid, CalendarClock, CreditCard, QrCode } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      icon: <LayoutGrid className="w-6 h-6 text-[#7A1F3D]" />,
      title: 'Elige tu servicio',
      description: 'Explora piscinas, canchas sintéticas, polideportivos, gimnasio o zona húmeda según tu preferencia.',
    },
    {
      number: '02',
      icon: <CalendarClock className="w-6 h-6 text-[#7A1F3D]" />,
      title: 'Selecciona fecha y hora',
      description: 'Consulta los cupos disponibles en tiempo real (08:00 a 17:00). El cobro se realiza por franjas de 1 hora.',
    },
    {
      number: '03',
      icon: <CreditCard className="w-6 h-6 text-[#7A1F3D]" />,
      title: 'Bloqueo y pago seguro',
      description: 'Tu cupo se reserva temporalmente por 10 minutos mientras realizas el pago en línea mediante Stripe (COP).',
    },
    {
      number: '04',
      icon: <QrCode className="w-6 h-6 text-[#7A1F3D]" />,
      title: 'Recibe tus códigos QR',
      description: 'Obtienes un código QR único por cada entrada, listo para ser escaneado por el personal al ingresar.',
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-[#F5F5F5] border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C8A96B]">
            Paso a paso
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#1F1F1F] tracking-tight">
            ¿Cómo funciona el proceso de reserva?
          </h2>
          <p className="text-sm sm:text-base text-[#6B7280]">
            Diseñado para ser rápido, transparente y sin filas. Tu ingreso al complejo es 100% digital.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="relative p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#7A1F3D]/10 flex items-center justify-center">
                    {step.icon}
                  </div>
                  <span className="text-3xl font-black text-[#7A1F3D]/20">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-extrabold text-lg text-[#1F1F1F] mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#F5F5F5] flex items-center gap-2 text-xs font-bold text-[#7A1F3D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96B]" />
                <span>Paso {idx + 1} de 4</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
