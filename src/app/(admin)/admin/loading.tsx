export default function AdminLoading() {
  return (
    <div className="space-y-8" aria-label="Cargando contenido">
      <div className="aops-hero-photo is-designed" aria-hidden="true">
        <div className="askeleton" style={{ position: "absolute", inset: 0, borderRadius: 0 }} />
      </div>
      <div className="akpi-grid" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="akpi-card space-y-3">
            <div className="askeleton h-4 w-28" />
            <div className="askeleton h-8 w-24" />
            <div className="askeleton h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-2" aria-hidden="true">
        <div className="askeleton h-5 w-52" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="askeleton h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
