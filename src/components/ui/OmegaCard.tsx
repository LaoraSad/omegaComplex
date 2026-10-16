import type { HTMLAttributes } from "react";

/**
 * Tarjeta con aro de luz giratorio (mismo lenguaje que el Inicio).
 * Envuelve `.omega-ring` + `.omega-ring-inner` para no repetir el patrón.
 */
interface OmegaCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Aro más fino, para cards pequeñas (ej. galería). */
  small?: boolean;
  /** Clases para el contenedor interior (flex, padding, etc.). */
  innerClassName?: string;
}

export default function OmegaCard({
  small = false,
  className = "",
  innerClassName = "",
  children,
  ...rest
}: OmegaCardProps) {
  return (
    <div className={`omega-ring ${small ? "omega-ring-sm" : ""} ${className}`.trim()} {...rest}>
      <div className={`omega-ring-inner ${innerClassName}`.trim()}>{children}</div>
    </div>
  );
}
