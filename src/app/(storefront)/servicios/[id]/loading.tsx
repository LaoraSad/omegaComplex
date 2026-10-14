// OPT-3: esqueleto instantáneo mientras el servidor lee el servicio.
export default function ServicioDetalleLoading() {
  return (
    <div className="bg-[#0e0b0d] text-white" aria-busy="true" aria-label="Cargando servicio">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <div className="space-y-6">
            <div className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
            <div className="h-6 w-2/3 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-full animate-pulse rounded bg-white/10" />
          </div>
          <div className="h-fit animate-pulse rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="h-5 w-24 rounded bg-white/10" />
            <div className="mt-3 h-7 w-40 rounded bg-white/10" />
          </div>
        </div>
      </main>
    </div>
  );
}
