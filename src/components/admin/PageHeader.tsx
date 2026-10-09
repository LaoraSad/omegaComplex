import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** Encabezado de sección: jerarquía H1 + contexto + acciones. */
export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="akpi-label admin-page-eyebrow">
          {eyebrow}
        </p>
        <h1 className="admin-section-title admin-page-title">
          {title}
        </h1>
        {description ? <p className="admin-section-sub">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
