import DarkSection from "@/components/ui/DarkSection";

// OPT-3: esqueleto instantáneo mientras el servidor lista las reservas.
export default function MisReservasLoading() {
  return (
    <DarkSection className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12" aria-busy="true" aria-label="Cargando reservas">
        <div className="space-y-3">
          <div className="h-8 w-56 animate-pulse rounded bg-white/10" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="h-5 w-1/2 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </DarkSection>
  );
}
