/**
 * Ambiente moderno: burbujas vinotinto/doradas flotantes + destellos dorados.
 * Decorativo, sin interactividad.
 */

interface AmbientBubblesProps {
  variant?: "mixed" | "gold" | "wine";
}

const BUBBLES: Array<{
  left: string;
  top: string;
  size: number;
  tone: "is-wine" | "is-gold" | "is-soft";
  duration: string;
  delay: string;
  floatB?: boolean;
}> = [
  { left: "6%", top: "18%", size: 92, tone: "is-wine", duration: "9s", delay: "0s" },
  { left: "88%", top: "12%", size: 54, tone: "is-gold", duration: "7.5s", delay: "1.2s", floatB: true },
  { left: "78%", top: "62%", size: 110, tone: "is-wine", duration: "11s", delay: "0.6s" },
  { left: "12%", top: "70%", size: 44, tone: "is-gold", duration: "8s", delay: "2s", floatB: true },
  { left: "46%", top: "8%", size: 28, tone: "is-soft", duration: "7s", delay: "0.9s" },
];

const SPARKS: Array<{ left: string; top: string; delay: string }> = [
  { left: "22%", top: "30%", delay: "0s" },
  { left: "64%", top: "24%", delay: "1.4s" },
  { left: "82%", top: "44%", delay: "2.6s" },
  { left: "36%", top: "78%", delay: "0.8s" },
  { left: "55%", top: "58%", delay: "3.2s" },
];

export default function AmbientBubbles({ variant = "mixed" }: AmbientBubblesProps) {
  const bubbles = BUBBLES.filter((b) => {
    if (variant === "mixed") return true;
    if (variant === "gold") return b.tone !== "is-wine";
    return b.tone !== "is-gold";
  });

  return (
    <div aria-hidden="true" className="omega-ambient">
      {bubbles.map((b, i) => (
        <span
          key={`b-${i}`}
          className={`omega-bubble ${b.tone}`}
          style={{
            left: b.left,
            top: b.top,
            width: b.size,
            height: b.size,
            animationDuration: b.duration,
            animationDelay: b.delay,
            animationName: b.floatB ? "omega-float-b" : undefined,
          }}
        />
      ))}
      {SPARKS.map((s, i) => (
        <span
          key={`s-${i}`}
          className="omega-spark"
          style={{ left: s.left, top: s.top, animationDelay: s.delay }}
        />
      ))}
    </div>
  );
}
