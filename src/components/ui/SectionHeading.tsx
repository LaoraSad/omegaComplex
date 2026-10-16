/**
 * Encabezado de sección con el lenguaje del Inicio: eyebrow dorado + hairline,
 * título en mayúsculas y subtítulo atenuado. Reutilizable en toda la app.
 */
interface SectionHeadingProps {
  kicker?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: "left" | "center";
  /** Contenido alineado a la derecha del título (botón/enlace). */
  action?: React.ReactNode;
  className?: string;
}

export default function SectionHeading({
  kicker,
  title,
  subtitle,
  align = "left",
  action,
  className = "",
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div className={`${centered ? "text-center" : ""} ${className}`.trim()}>
      {kicker ? (
        <p
          className={`flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#e3bd74] ${
            centered ? "justify-center" : ""
          }`}
        >
          <span>{kicker}</span>
          <span className="inline-block h-px w-14 bg-[#e3bd74]/50" />
        </p>
      ) : null}

      <div
        className={
          action ? "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" : undefined
        }
      >
        <h2 className="mt-3 text-[30px] font-black uppercase leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-[42px]">
          {title}
        </h2>
        {action}
      </div>

      {subtitle ? (
        <p
          className={`mt-3 text-sm text-white/60 sm:text-base ${
            centered ? "mx-auto max-w-xl" : "max-w-2xl"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
