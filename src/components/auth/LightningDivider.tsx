"use client";

/**
 * LightningDivider
 * Rayo inclinado que separa el hero del panel de login/registro.
 *
 * Cómo funciona: el SVG dibuja DOS cosas a la vez:
 *   1. El relleno del panel (color del login) a la derecha del rayo.
 *   2. El rayo en sí (vino tinto + negro + núcleo blanco) y sus destellos.
 * Así no hace falta un clip-path que coincida con nada: el hero queda
 * debajo y el SVG "muerde" su borde derecho con la forma del rayo.
 */

const PANEL_BG = "#FAF6F5"; // mismo color de fondo del panel de login

// Línea central del rayo (viewBox 140 x 900). Cae de arriba-derecha a abajo-izquierda.
const BOLT = "118,0 88,200 116,235 60,470 92,505 34,720 60,752 22,900";

export function LightningDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 140 900"
      preserveAspectRatio="none"
      className={`auth-lightning-svg ${className}`.trim()}
    >
      <defs>
        <linearGradient id="ld-wine" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="900">
          <stop offset="0" stopColor="#2A0C17" />
          <stop offset="0.3" stopColor="#8E2347" />
          <stop offset="0.6" stopColor="#5E1730" />
          <stop offset="0.85" stopColor="#8E2347" />
          <stop offset="1" stopColor="#2A0C17" />
        </linearGradient>
        <filter id="ld-glow" x="-100%" y="-10%" width="300%" height="120%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="ld-soft" x="-100%" y="-10%" width="300%" height="120%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <path
          id="ld-spark"
          d="M0,-9 L2,-2 L9,0 L2,2 L0,9 L-2,2 L-9,0 L-2,-2 Z"
        />
      </defs>

      <style>{`
        .ld-pulse   { animation: ld-pulse 2.8s ease-in-out infinite; }
        .ld-flicker { animation: ld-flicker 3.6s steps(1, end) infinite; }
        .ld-spark   { transform-box: fill-box; transform-origin: center; animation: ld-spark 2.4s ease-in-out infinite; }
        .ld-branch  { stroke-dasharray: 60; stroke-dashoffset: 60; animation: ld-branch 3.2s ease-out infinite; }
        @keyframes ld-pulse   { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        @keyframes ld-flicker { 0%,100% { opacity: 1 } 8% { opacity: .45 } 12% { opacity: 1 } 52% { opacity: .7 } 56% { opacity: 1 } }
        @keyframes ld-spark   { 0%,100% { transform: scale(.2); opacity: 0 } 45% { transform: scale(1); opacity: 1 } 70% { transform: scale(.6); opacity: .5 } }
        @keyframes ld-branch  { 0% { stroke-dashoffset: 60; opacity: 0 } 15% { opacity: 1 } 45% { stroke-dashoffset: 0; opacity: 1 } 70%,100% { stroke-dashoffset: 0; opacity: 0 } }
        @media (prefers-reduced-motion: reduce) {
          .ld-pulse, .ld-flicker, .ld-spark, .ld-branch { animation: none; opacity: 1; stroke-dashoffset: 0; transform: none; }
        }
      `}</style>

      {/* 1. Relleno del panel, a la derecha del rayo */}
      <polygon points={`${BOLT} 140,900 140,0`} fill={PANEL_BG} />

      {/* 2. Resplandor vino tinto detrás del rayo */}
      <polyline
        points={BOLT}
        fill="none"
        stroke="#B3295A"
        strokeWidth="26"
        strokeLinejoin="miter"
        strokeMiterlimit="10"
        filter="url(#ld-glow)"
        className="ld-pulse"
      />

      {/* 3. Cuerpo del rayo: vino tinto, núcleo negro, filo blanco */}
      <g className="ld-flicker">
        <polyline points={BOLT} fill="none" stroke="url(#ld-wine)" strokeWidth="21" strokeLinejoin="miter" strokeMiterlimit="10" />
        <polyline points={BOLT} fill="none" stroke="#0E0508" strokeWidth="10" strokeLinejoin="miter" strokeMiterlimit="10" />
        <polyline points={BOLT} fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinejoin="miter" strokeMiterlimit="10" filter="url(#ld-soft)" />
        <polyline points={BOLT} fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="miter" strokeMiterlimit="10" />
      </g>

      {/* 4. Ramificaciones hacia el hero */}
      <g fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round">
        <polyline className="ld-branch" style={{ animationDelay: "0.2s" }} strokeWidth="1.6" points="80,190 54,178 44,200 22,196" />
        <polyline className="ld-branch" style={{ animationDelay: "1.4s" }} strokeWidth="1.4" points="52,462 28,452 18,476" />
        <polyline className="ld-branch" style={{ animationDelay: "2.2s" }} strokeWidth="1.4" points="28,710 10,694 4,716" />
      </g>

      {/* 5. Destellos blancos en los quiebres */}
      <g fill="#FFFFFF">
        <use href="#ld-spark" x="88" y="200" className="ld-spark" style={{ animationDelay: "0s" }} />
        <use href="#ld-spark" x="116" y="235" className="ld-spark" style={{ animationDelay: "0.7s" }} transform="scale(.7)" />
        <use href="#ld-spark" x="60" y="470" className="ld-spark" style={{ animationDelay: "1.2s" }} />
        <use href="#ld-spark" x="92" y="505" className="ld-spark" style={{ animationDelay: "1.9s" }} transform="scale(.7)" />
        <use href="#ld-spark" x="34" y="720" className="ld-spark" style={{ animationDelay: "0.4s" }} />
      </g>
    </svg>
  );
}

export default LightningDivider;
