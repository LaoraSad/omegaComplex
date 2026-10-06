import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
}

/** Estado vacío profesional: icono sobrio, título, explicación y acción. */
export function EmptyState({ icon: Icon = SearchX, title, text, action }: EmptyStateProps) {
  return (
    <div className="aempty">
      <span aria-hidden="true" className="aempty-icon">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <p className="aempty-title">{title}</p>
      {text ? <p className="aempty-text">{text}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
