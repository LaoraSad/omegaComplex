// OPT-3: esqueleto instantáneo mientras el servidor arma el catálogo.
export default function ServiciosLoading() {
  return (
    <div className="bg-[#0e0b0d] text-white" aria-busy="true" aria-label="Cargando catálogo">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <div className="h-3 w-40 animate-pulse rounded bg-white/10" />
          <div className="h-9 w-72 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-white/10" />
        </div>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
