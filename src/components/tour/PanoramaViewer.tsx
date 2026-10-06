'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import NextImage from 'next/image';
import { optimized360 } from '@/lib/storefront/optimized-360';

interface Props { src: string; autoRotate?: boolean; caption?: string; hideHud?: boolean; }

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
const FRAG = `precision highp float;
uniform sampler2D tex;uniform vec2 res;uniform float yaw,pitch,fov;uniform float srgbOut;
#define PI 3.14159265
void main(){
  float asp=res.x/res.y,th=tan(fov*.5*PI/180.);
  vec3 ray=normalize(vec3((gl_FragCoord.x/res.x*2.-1.)*th*asp,
                          (gl_FragCoord.y/res.y*2.-1.)*th,1.));
  float cp=cos(pitch),sp=sin(pitch);
  ray=vec3(ray.x,ray.y*cp-ray.z*sp,ray.y*sp+ray.z*cp);
  float cy=cos(yaw),sy=sin(yaw);
  ray=vec3(ray.x*cy+ray.z*sy,ray.y,-ray.x*sy+ray.z*cy);
  float lon=atan(ray.x,ray.z),lat=asin(clamp(ray.y,-1.,1.));
  float u=fract(lon/(2.*PI)+.5);
  float v=clamp(.5-lat/PI,0.,1.);
  vec3 c=texture2D(tex,vec2(u,v)).rgb;
  // Si la textura se decodificó a lineal (sRGB), hay que volver a gamma
  // al escribir al canvas; si no, todo se vería oscuro.
  if(srgbOut>.5){c=pow(c,vec3(.4545));}
  gl_FragColor=vec4(c,1.);
}`;

export default function PanoramaViewer({ src, autoRotate = false, caption, hideHud = false }: Props) {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgElRef  = useRef<HTMLImageElement>(null);

  // Camera state.
  // FOV estrecho por defecto: la proyección rectilínea estira los bordes
  // (efecto ojo de pez) y el FOV amplio lo exagera. 42° se ve natural.
  const cam   = useRef({ yaw: 0, pitch: 0, fov: 42 });
  const drag  = useRef({ on: false, lx: 0, ly: 0 });
  const rafId = useRef(0);

  // WebGL objects — all in refs so callbacks always see latest values
  const glRef   = useRef<WebGLRenderingContext | null>(null);
  const progRef = useRef<WebGLProgram | null>(null);
  const texRef  = useRef<WebGLTexture | null>(null);   // ← was missing before
  const srgbRef = useRef(false); // true si la textura decodifica sRGB a lineal

  const [mode, setMode]         = useState<'loading'|'webgl'|'css'|'error'>('loading');
  const modeRef                 = useRef<'loading'|'webgl'|'css'|'error'>('loading');
  const [isPlaying, setIsPlaying] = useState(autoRotate);
  const playRef = useRef(autoRotate);
  const [isDragging, setIsDragging] = useState(false);

  /* ── WebGL draw ───────────────────────────────────────────────────── */
  const drawGL = useCallback(() => {
    const g  = glRef.current;
    const pr = progRef.current;
    const tx = texRef.current;   // ← use the ref
    const cv = canvasRef.current;
    if (!g || !pr || !tx || !cv || cv.width === 0) return;

    g.viewport(0, 0, cv.width, cv.height);
    g.useProgram(pr);
    g.activeTexture(g.TEXTURE0);
    g.bindTexture(g.TEXTURE_2D, tx);
    g.uniform1i(g.getUniformLocation(pr, 'tex'), 0);
    g.uniform2f(g.getUniformLocation(pr, 'res'),   cv.width, cv.height);
    g.uniform1f(g.getUniformLocation(pr, 'yaw'),   cam.current.yaw   * Math.PI / 180);
    g.uniform1f(g.getUniformLocation(pr, 'pitch'), cam.current.pitch * Math.PI / 180);
    g.uniform1f(g.getUniformLocation(pr, 'fov'),   cam.current.fov);
    g.uniform1f(g.getUniformLocation(pr, 'srgbOut'), srgbRef.current ? 1 : 0);
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
  }, []);

  /* ── CSS fallback draw (panning via objectPosition) ──────────────── */
  const drawCSS = useCallback(() => {
    const el = imgElRef.current;
    if (!el) return;
    const xPct = (((-cam.current.yaw % 360) + 360) % 360) / 360 * 100;
    const yPct = 50 + cam.current.pitch / 1.5;
    el.style.objectPosition = `${xPct.toFixed(2)}% ${yPct.toFixed(2)}%`;
  }, []);

  /* ── Render loop ──────────────────────────────────────────────────── */
  // El bucle se re-programa a sí mismo, así que se referencia a través de un
  // ref: usar `tick` dentro de su propio useCallback lo declararía después de uso.
  const tickRef = useRef<() => void>(() => {});

  const tick = useCallback(() => {
    if (playRef.current && !drag.current.on) cam.current.yaw += 0.1;
    const m = modeRef.current;
    if (m === 'webgl') drawGL();
    else if (m === 'css') drawCSS();
    rafId.current = requestAnimationFrame(tickRef.current);
  }, [drawGL, drawCSS]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  /* ── Boot: load image → choose WebGL or CSS ──────────────────────── */
  useEffect(() => {
    // Start render loop immediately (shows nothing until loaded, which is fine)
    rafId.current = requestAnimationFrame(tick);

    const img = new Image();
    // Same-origin: do NOT set crossOrigin (avoids CORS preflight issues)
    img.onload = () => {
      const cv = canvasRef.current;
      // WebGL2 primero: permite mipmaps + anisotropía en texturas NPOT
      // (casi todos los JPEG 360 lo son). Si no hay, se degrada a WebGL1.
      const g2 = cv?.getContext('webgl2', { antialias: true, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' }) as WebGLRenderingContext | null;
      const g1 = !g2 ? (cv?.getContext('webgl', { antialias: true, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' }) ?? null) : null;
      const g = g2 ?? g1;
      const isWebGL2 = g2 !== null;

      if (g) {
        try {
          // Compile shaders
          const vs = g.createShader(g.VERTEX_SHADER)!;
          g.shaderSource(vs, VERT); g.compileShader(vs);
          const fs = g.createShader(g.FRAGMENT_SHADER)!;
          g.shaderSource(fs, FRAG); g.compileShader(fs);
          if (!g.getShaderParameter(fs, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(fs) ?? '');

          const pr = g.createProgram()!;
          g.attachShader(pr, vs); g.attachShader(pr, fs); g.linkProgram(pr);
          if (!g.getProgramParameter(pr, g.LINK_STATUS)) throw new Error('link failed');

          // Fullscreen quad
          const buf = g.createBuffer()!;
          g.bindBuffer(g.ARRAY_BUFFER, buf);
          g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), g.STATIC_DRAW);
          const aLoc = g.getAttribLocation(pr, 'p');
          g.enableVertexAttribArray(aLoc);
          g.vertexAttribPointer(aLoc, 2, g.FLOAT, false, 0, 0);

          // Upload texture.
          // sRGB primero: sin decodificación sRGB los medios tonos se ven
          // lavados frente al <img> (que sí gestiona color). WebGL2 lo trae
          // nativo; en WebGL1 se usa la extensión, y si no existe se degrada
          // al RGB clásico sin romper nada.
          const tx = g.createTexture()!;
          g.bindTexture(g.TEXTURE_2D, tx);
          g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, 0);
          let internalFormat: number = g.RGB;
          let srgbDecode = false;
          if (isWebGL2 && 'SRGB8_ALPHA8' in g) {
            internalFormat = (g as WebGL2RenderingContext).SRGB8_ALPHA8;
            srgbDecode = true;
          } else {
            const srgbExt = g.getExtension('EXT_sRGB');
            if (srgbExt && 'SRGB_ALPHA_EXT' in srgbExt) {
              internalFormat = (srgbExt as { SRGB_ALPHA_EXT: number }).SRGB_ALPHA_EXT;
              srgbDecode = true;
            }
          }
          srgbRef.current = srgbDecode;
          g.texImage2D(g.TEXTURE_2D, 0, internalFormat, g.RGB, g.UNSIGNED_BYTE, img);
          if (isWebGL2) {
            // Trilineal: nítido a cualquier zoom/distancia, sin shimmer.
            g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR_MIPMAP_LINEAR);
            g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
            g.generateMipmap(g.TEXTURE_2D);
          } else {
            // WebGL1 + NPOT: sin mipmaps (quedaría en negro). Se mantiene LINEAR.
            g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
            g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
          }
          g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
          g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
          // Anisotropía: recupera detalle en los bordes en ángulo rasante,
          // justo donde el ojo de pez más se nota. Topa en 8x por rendimiento.
          const anisoExt = g.getExtension('EXT_texture_filter_anisotropic');
          if (anisoExt) {
            const max = g.getParameter(anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number;
            g.texParameterf(
              g.TEXTURE_2D,
              anisoExt.TEXTURE_MAX_ANISOTROPY_EXT,
              Math.min(8, typeof max === 'number' ? max : 1),
            );
          }
          // Si la subida falló en silencio (textura incompleta = canvas negro),
          // se fuerza el fallback CSS que sí muestra la imagen plana.
          if (g.getError() !== g.NO_ERROR) throw new Error('texture upload failed');

          // Save to refs so drawGL can access them
          glRef.current   = g;
          progRef.current = pr;
          texRef.current  = tx;   // ← the critical missing piece

          modeRef.current = 'webgl';
          setMode('webgl');
        } catch {
          // WebGL failed → fallback
          modeRef.current = 'css';
          setMode('css');
        }
      } else {
        modeRef.current = 'css';
        setMode('css');
      }
    };

    // Cadena de fuentes: viewer (alta fidelidad) → AVIF → WebP → JPG original.
    // El manifiesto es unión de literales: se lee con forma laxa.
    const entry = optimized360(src) as
      | { avif?: string; webp?: string; viewer?: string; jpg?: string }
      | null;
    const candidates = entry
      ? [entry.viewer, entry.avif, entry.webp, entry.jpg ?? src].filter(
          (u): u is string => !!u,
        )
      : [src];
    let attempt = 0;

    img.onerror = () => {
      attempt += 1;
      const next = candidates[attempt];
      if (attempt < candidates.length && next) {
        img.src = next;
        return;
      }
      console.warn('[PanoramaViewer] no se pudo cargar:', src, '(se probó:', candidates.join(', '), ')');
      modeRef.current = 'error'; setMode('error');
    };
    img.src = candidates[0] ?? src;

    return () => cancelAnimationFrame(rafId.current);
  }, [src, tick]);

  /* ── HiDPI canvas resize ──────────────────────────────────────────── */
  useEffect(() => {
    const cv = canvasRef.current; const wrap = wrapRef.current;
    if (!cv || !wrap) return;
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      cv.width  = Math.round(wrap.offsetWidth  * dpr);
      cv.height = Math.round(wrap.offsetHeight * dpr);
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  /* ── Pointer events ───────────────────────────────────────────────── */
  const pDown = (x: number, y: number) => {
    playRef.current = false; setIsPlaying(false);
    drag.current = { on: true, lx: x, ly: y };
    setIsDragging(true);
  };
  const pMove = (x: number, y: number) => {
    if (!drag.current.on) return;
    cam.current.yaw   -= (x - drag.current.lx) * 0.25;
    cam.current.pitch  = Math.max(-85, Math.min(85, cam.current.pitch + (y - drag.current.ly) * 0.25));
    drag.current.lx = x; drag.current.ly = y;
  };
  useEffect(() => {
    const up = () => {
      if (drag.current.on) setIsDragging(false);
      drag.current.on = false;
    };
    const mv = (e: MouseEvent) => pMove(e.clientX, e.clientY);
    window.addEventListener('mouseup', up);
    window.addEventListener('mousemove', mv);
    return () => { window.removeEventListener('mouseup', up); window.removeEventListener('mousemove', mv); };
  }, []);

  const togglePlay = () => { const n = !playRef.current; playRef.current = n; setIsPlaying(n); };
  // Zoom contenido (35–85°): más allá el ojo de pez y el blur dominan la imagen.
  const zoom = (d: number) => { cam.current.fov = Math.max(35, Math.min(85, cam.current.fov + d)); };

  /* ── Rueda del ratón: listener nativo no-pasivo (React los pone pasivos
     y preventDefault ahí solo genera el warning sin bloquear el scroll). ── */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      zoom(e.deltaY * 0.05);
    };
    wrap.addEventListener('wheel', onWheelNative, { passive: false });
    return () => wrap.removeEventListener('wheel', onWheelNative);
  }, []);




  /* ── JSX ──────────────────────────────────────────────────────────── */
  const poster = optimized360(src);
  const posterBlur = poster?.blur;
  return (
    <div
      ref={wrapRef}
      className={`relative w-full h-full rounded-xl overflow-hidden bg-[#050a14] select-none`}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      onMouseDown={e => pDown(e.clientX, e.clientY)}
      onTouchStart={e => pDown(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={e => pMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={() => { drag.current.on = false; setIsDragging(false); }}
      onTouchCancel={() => { drag.current.on = false; setIsDragging(false); }}
          >
      {/* Póster plano: garantiza imagen visible mientras carga o si WebGL falla.
          En modo css el <img> de abajo ya la muestra, así que no se duplica. */}
      {(mode === 'loading' || mode === 'error') && (
        <NextImage
          src={src}
          alt="Vista previa 360°"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          placeholder={posterBlur ? 'blur' : undefined}
          blurDataURL={posterBlur}
          className="object-cover"
        />
      )}
      {/* WebGL canvas */}
      <canvas
        ref={canvasRef}
        style={{ display: mode === 'webgl' ? 'block' : 'none', width: '100%', height: '100%' }}
      />

      {/* CSS panorama fallback */}
      {mode === 'css' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgElRef}
          src={src}
          alt="panorama 360°"
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 50%' }}
        />
      )}

      {/* Loading */}
      {mode === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin" />
          <p className="text-white/60 text-sm font-medium">Cargando imagen 360°…</p>
        </div>
      )}

      {/* Error */}
      {mode === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <span className="text-5xl">⚠️</span>
          <p className="text-red-400 font-semibold">No se pudo cargar la imagen</p>
          <code className="text-white/30 text-xs bg-white/5 px-3 py-1.5 rounded break-all">{src}</code>
        </div>
      )}

      {/* Caption badge en pantalla completa */}
      {caption && (
        <div className="pointer-events-none absolute top-3 left-3 z-20 bg-black/60 backdrop-blur-md rounded-full px-3.5 py-1.5 text-xs font-bold text-white border border-white/20 flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          <span>{caption}</span>
        </div>
      )}

      {/* HUD */}
      {!hideHud && (mode === 'webgl' || mode === 'css') && (
        <>
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs text-white/70 flex items-center gap-2 whitespace-nowrap z-20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {`${mode === 'webgl' ? '360° WebGL HD' : '360° Panorama'} · Arrastra · Scroll zoom`}
            </span>
          </div>
          <div
            className="absolute bottom-3 right-3 flex items-center gap-2 z-20"
            onMouseDown={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={togglePlay}
              className={`pointer-events-auto backdrop-blur-sm border rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                isPlaying ? 'bg-cyan-500/30 border-cyan-400/50 text-cyan-300' : 'bg-black/60 border-white/20 text-white hover:bg-white/10'
              }`}
            >
              {isPlaying ? '⏸ Pausar' : '▶ Auto'}
            </button>
            <button
              type="button"
              onClick={() => zoom(-10)}
              className="pointer-events-auto bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white hover:bg-white/10 cursor-pointer"
              title="Acercar (Zoom +)"
            >
              🔍+
            </button>
            <button
              type="button"
              onClick={() => zoom(10)}
              className="pointer-events-auto bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white hover:bg-white/10 cursor-pointer"
              title="Alejar (Zoom −)"
            >
              🔍−</button>
          </div>
        </>
      )}
    </div>
  );
}
