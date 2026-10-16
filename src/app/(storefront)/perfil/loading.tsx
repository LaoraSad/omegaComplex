import DarkSection from "@/components/ui/DarkSection";

// OPT-3: esqueleto instantáneo mientras el servidor lee el perfil.
export default function PerfilLoading() {
  return (
    <DarkSection className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" aria-busy="true" aria-label="Cargando perfil">
        <div className="space-y-2">
          <div className="h-3 w-40 animate-pulse rounded bg-white/10" />
          <div className="h-8 w-64 animate-pulse rounded bg-white/10" />
        </div>
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 animate-pulse rounded-full bg-white/10" />
            <div className="space-y-2">
              <div className="h-5 w-48 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </DarkSection>
  );
}
