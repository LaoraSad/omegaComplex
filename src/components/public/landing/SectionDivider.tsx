/**
 * Divisor de secciones inspirado en `docs/assets/divider.svg` (rama develop):
 * base vinotinto tenue + barrido dorado animado como estado de carga.
 * CSS puro, sin imágenes externas. Respeta `prefers-reduced-motion`.
 */
export default function SectionDivider() {
  return (
    <div aria-hidden="true" className="omega-divider bg-[#0e0b0d]">
      <span className="omega-divider-track" />
      <span className="omega-divider-shine" />
      <span className="omega-divider-diamond" />
    </div>
  );
}
