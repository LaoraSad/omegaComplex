'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface Props { src: string; autoRotate?: boolean; caption?: string; hideHud?: boolean; }

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
const FRAG = `precision highp float;
uniform sampler2D tex;uniform vec2 res;uniform float yaw,pitch,fov;
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
  gl_FragColor=texture2D(tex,vec2(u,v));
}`;

export default function PanoramaViewer({ src, autoRotate = false, caption, hideHud = false }: Props) {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgElRef  = useRef<HTMLImageElement>(null);

  // Camera state
  const cam   = useRef({ yaw: 0, pitch: 0, fov: 55 });
  const drag  = useRef({ on: false, lx: 0, ly: 0 });
  const rafId = useRef(0);

  // WebGL objects — all in refs so callbacks always see latest values
  const glRef   = useRef<WebGLRenderingContext | null>(null);
  const progRef = useRef<WebGLProgram | null>(null);
  const texRef  = useRef<WebGLTexture | null>(null);   // ← was missing before

  const [mode, setMode]         = useState<'loading'|'webgl'|'css'|'error'>('loading');
  const modeRef                 = useRef<'loading'|'webgl'|'css'|'error'>('loading');
  const [isPlaying, setIsPlaying] = useState(autoRotate);
  const playRef = useRef(autoRotate);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      const g  = cv?.getContext('webgl', { antialias: true, alpha: false }) ?? null;

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

          // Upload texture
          const tx = g.createTexture()!;
          g.bindTexture(g.TEXTURE_2D, tx);
          g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, 0);
          g.texImage2D(g.TEXTURE_2D, 0, g.RGB, g.RGB, g.UNSIGNED_BYTE, img);
          // NPOT textures (most JPEGs) require LINEAR + CLAMP_TO_EDGE in WebGL1
          // Using MIPMAP or REPEAT on NPOT = silent black texture
          g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
          g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
          g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
          g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);

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

    img.onerror = () => { modeRef.current = 'error'; setMode('error'); };
    img.src = src;

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
  const zoom = (d: number) => { cam.current.fov = Math.max(30, Math.min(110, cam.current.fov + d)); };

  /* ── Fullscreen toggle ────────────────────────────────────────────── */
  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current as (HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      mozRequestFullScreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    }) | null;

    if (!el) return;

    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      mozFullScreenElement?: Element;
      msFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
      mozCancelFullScreen?: () => Promise<void>;
      msExitFullscreen?: () => Promise<void>;
    };

    const isFull = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isFull) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  }, []);

  useEffect(() => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      mozFullScreenElement?: Element;
      msFullscreenElement?: Element;
    };

    const handleFullscreenChange = () => {
      const activeEl =
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement;
      const active = activeEl === wrapRef.current;
      setIsFullscreen(active);

      const cv = canvasRef.current;
      const wrap = wrapRef.current;
      if (cv && wrap) {
        const dpr = window.devicePixelRatio || 1;
        cv.width = Math.round(wrap.offsetWidth * dpr);
        cv.height = Math.round(wrap.offsetHeight * dpr);
        if (modeRef.current === 'webgl') {
          drawGL();
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [drawGL]);

  // Tecla F o f para pantalla completa
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'f' || e.key === 'F') &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        if (
          wrapRef.current &&
          (document.fullscreenElement === wrapRef.current || wrapRef.current.matches(':hover'))
        ) {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  /* ── JSX ──────────────────────────────────────────────────────────── */
  return (
    <div
      ref={wrapRef}
      className={`relative w-full h-full ${
        isFullscreen ? 'rounded-none' : 'rounded-xl'
      } overflow-hidden bg-[#050a14] select-none`}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      onMouseDown={e => pDown(e.clientX, e.clientY)}
      onTouchStart={e => pDown(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={e => { e.preventDefault(); pMove(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchEnd={() => { drag.current.on = false; setIsDragging(false); }}
      onTouchCancel={() => { drag.current.on = false; setIsDragging(false); }}
      onWheel={e => { e.preventDefault(); zoom(e.deltaY * 0.05); }}
      onDoubleClick={toggleFullscreen}
    >
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
              {isFullscreen
                ? 'Pantalla Completa · Doble clic o Esc para salir'
                : `${mode === 'webgl' ? '360° WebGL HD' : '360° Panorama'} · Arrastra · Scroll zoom`}
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
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`pointer-events-auto backdrop-blur-sm border rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 font-semibold transition-all cursor-pointer shadow-md ${
                isFullscreen
                  ? 'bg-rose-500/30 border-rose-400/50 text-rose-200 hover:bg-rose-500/40'
                  : 'bg-black/75 border-white/25 text-white hover:bg-white/20 hover:border-white/40'
              }`}
              title={isFullscreen ? 'Salir de pantalla completa (Esc o F)' : 'Ver en pantalla completa (Doble clic o F)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-rose-300" />
                  <span>Salir</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-rose-300" />
                  <span>Pantalla completa</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
