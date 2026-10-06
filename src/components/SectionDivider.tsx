/**
 * Divisor de secciones inspirado en `docs/assets/divider.svg` (rama develop):
 * base vinotinto tenue + barrido dorado animado como estado de carga.
 * CSS puro, sin imágenes externas. Respeta `prefers-reduced-motion`.
 */
interface SectionDividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export default function SectionDivider({
  orientation = "horizontal",
  className = "",
}: SectionDividerProps) {
  if (orientation === "vertical") {
    return (
      <div aria-hidden="true" className={`omega-divider-v ${className}`.trim()}>
        <span className="omega-divider-v-track" />
        <span className="omega-divider-v-shine" />
        <span className="omega-divider-v-diamond" />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={`omega-divider ${className}`.trim()}>
      <span className="omega-divider-track" />
      <span className="omega-divider-shine" />
      <span className="omega-divider-diamond" />
    </div>
  );
}
