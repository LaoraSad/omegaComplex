import AmbientBubbles from "@/components/AmbientBubbles";

/**
 * Fondo oscuro del Inicio (resplandores vino + dorado) reutilizable en toda la
 * app. Centraliza `.omega-dark-section` / `-2` / `.omega-dark-panel`, el
 * resplandor CTA y las burbujas ambientales para que cada vista se vea igual.
 */
interface DarkSectionProps {
  children: React.ReactNode;
  /** "section" = fondo de página completo; "panel" = superficie redondeada. */
  as?: "section" | "panel";
  /** Variante de resplandor: "1" vino marcado, "2" vino tenue. */
  variant?: "1" | "2";
  /** Burbujas ambientales; "none" para omitirlas. */
  bubbles?: "mixed" | "gold" | "wine" | "none";
  /** Resplandor central tipo CTA. */
  glow?: boolean;
  className?: string;
}

export default function DarkSection({
  children,
  as = "section",
  variant = "1",
  bubbles = "mixed",
  glow = true,
  className = "",
}: DarkSectionProps) {
  const base = as === "panel" ? "omega-dark-panel" : variant === "2" ? "omega-dark-section-2" : "omega-dark-section";

  return (
    <div className={`${base} relative overflow-hidden text-white ${className}`.trim()}>
      {glow ? <div aria-hidden="true" className="omega-cta-glow" /> : null}
      {bubbles !== "none" ? <AmbientBubbles variant={bubbles} /> : null}
      <div className="relative">{children}</div>
    </div>
  );
}
