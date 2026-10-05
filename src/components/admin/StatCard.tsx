import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  context?: string;
  icon: LucideIcon;
  accent?: boolean;
}

/** KPI compacto: etiqueta, valor destacado, icono y contexto real. */
export function StatCard({ label, value, context, icon: Icon, accent }: StatCardProps) {
  return (
    <div
      className="acard acard-pad"
      style={accent ? { borderColor: "#e3c3cf", background: "#fdf7f9" } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="akpi-label">{label}</p>
          <p className="akpi-value">{value}</p>
          {context ? <p className="akpi-context">{context}</p> : null}
        </div>
        <span aria-hidden="true" className="akpi-icon">
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </span>
      </div>
    </div>
  );
}
