import { Clock, QrCode, ClipboardList } from 'lucide-react';

export default function ComplexInfo() {
  return (
    <section id="nosotros" className="scroll-mt-20 bg-[#f4f1f0] py-16 sm:py-20">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="max-w-[640px]">
          <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#b98a3c]">
            <span>Nosotros · El complejo</span>
            <span className="inline-block h-px w-14 bg-[#b98a3c]/60" />
          </p>
          <h2 className="mt-3 text-[30px] font-black uppercase leading-[1.05] tracking-tight text-[#161214] sm:text-4xl">
            Un complejo pensado para ti
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[#5c565a]">
            Horarios oficiales, control de acceso con QR y normas claras para que
            disfrutes tu visita sin contratiempos.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="border-t-2 border-[#7a1f3d] bg-white p-7">
            <Clock className="h-6 w-6 text-[#7a1f3d]" strokeWidth={1.6} />
            <h3 className="mt-4 text-[15px] font-extrabold uppercase tracking-wide text-[#161214]">
              Horarios de operación
            </h3>
            <dl className="mt-4 space-y-2.5 text-[13px] text-[#5c565a]">
              <div className="flex justify-between border-b border-[#efe9e7] pb-2">
                <dt>Martes a Domingo</dt>
                <dd className="font-bold text-[#161214]">08:00 – 17:00</dd>
              </div>
              <div className="flex justify-between border-b border-[#efe9e7] pb-2">
                <dt>Lunes</dt>
                <dd className="font-bold text-[#7a1f3d]">Cerrado · Mantenimiento</dd>
              </div>
            </dl>
            <p className="mt-3 text-[12px] leading-relaxed text-[#5c565a]">
              Si el lunes es festivo, el mantenimiento se traslada al martes.
            </p>
          </div>

          <div className="border-t-2 border-[#7a1f3d] bg-white p-7">
            <QrCode className="h-6 w-6 text-[#7a1f3d]" strokeWidth={1.6} />
            <h3 className="mt-4 text-[15px] font-extrabold uppercase tracking-wide text-[#161214]">
              Acceso con QR
            </h3>
            <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed text-[#5c565a]">
              <li><strong className="text-[#161214]">Horario estricto:</strong> ingresa dentro de tu franja reservada.</li>
              <li><strong className="text-[#161214]">Sin tolerancia:</strong> no hay acceso tras finalizar la franja.</li>
              <li><strong className="text-[#161214]">QR único:</strong> un código por entrada, de un solo uso.</li>
            </ul>
          </div>

          <div className="border-t-2 border-[#7a1f3d] bg-white p-7">
            <ClipboardList className="h-6 w-6 text-[#7a1f3d]" strokeWidth={1.6} />
            <h3 className="mt-4 text-[15px] font-extrabold uppercase tracking-wide text-[#161214]">
              Normas obligatorias
            </h3>
            <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed text-[#5c565a]">
              <li><strong className="text-[#161214]">Piscinas:</strong> uso obligatorio de licras y gorro.</li>
              <li><strong className="text-[#161214]">Gimnasio:</strong> mayores de 12 años, calzado deportivo, sin ingreso mojado.</li>
              <li>Reservas por hora, hasta 3 meses de anticipación.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
