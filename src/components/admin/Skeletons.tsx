/** Skeletons para los estados de carga del admin (usados en loading.tsx). */

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="acard acard-pad space-y-3">
          <div className="askeleton h-3 w-24" />
          <div className="askeleton h-8 w-32" />
          <div className="askeleton h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="atable-wrap" aria-hidden="true">
      <div className="space-y-0 p-4">
        <div className="askeleton mb-3 h-4 w-1/3" />
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-3 border-t border-[#f0e9e6] py-3 first:border-t-0">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="askeleton h-4"
                style={{ width: `${100 / cols}%`, opacity: 1 - c * 0.08 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="acard acard-pad" aria-hidden="true">
      <div className="askeleton mb-2 h-4 w-48" />
      <div className="askeleton mb-4 h-3 w-64" />
      <div className="abars">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="abar-col">
            <div className="abar is-empty" style={{ height: `${18 + ((i * 37) % 70)}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-label="Cargando contenido">
      <div className="space-y-2">
        <div className="askeleton h-3 w-28" />
        <div className="askeleton h-7 w-64" />
        <div className="askeleton h-4 w-96" style={{ maxWidth: "100%" }} />
      </div>
      <CardsSkeleton />
      <TableSkeleton />
    </div>
  );
}
