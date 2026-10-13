'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Maximize2,
  Smartphone,
  RotateCcw,
  Compass,
  ImageOff,
} from 'lucide-react';

interface Tour360Props {
  src: string;
  title?: string;
  subtitle?: string;
  trigger: React.ReactNode;
}

const MIN_FOV = 32;
const MAX_FOV = 95;
const IDLE_MS = 2600;
/** Grados por píxel a fov 75. */
const DRAG_K = 0.11;
/** Duración de la inercia tras soltar. */
const INERTIA_MS = 700;
/** Fracción de la velocidad de arrastre que se conserva al soltar. */
const INERTIA_GAIN = 0.9;
const clampLat = (v: number) => Math.max(-85, Math.min(85, v));

/**
 * Visor 360° estilo Facebook: esfera equirectangular en WebGL,
 * arrastre con inercia, zoom con rueda/pellizco, pantalla completa
 * y orientación del dispositivo (móvil). El módulo de three.js se
 * carga solo cuando el usuario abre el visor.
 */
export default function Tour360({ src, title, subtitle, trigger }: Tour360Props) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hinted, setHinted] = useState(false);
  const [gyroOn, setGyroOn] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const hintShownRef = useRef(false);
  const apiRef = useRef<{
    fullscreen: () => void;
    reset: () => void;
    setGyro: (on: boolean) => Promise<boolean>;
  } | null>(null);

  const close = useCallback(() => {
    setReady(false);
    setOpen(false);
    setGyroOn(false);
  }, []);

  const enableGyro = useCallback(async () => {
    const next = await apiRef.current?.setGyro(!gyroOn);
    setGyroOn(Boolean(next));
  }, [gyroOn]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  /* El visor WebGL se monta una vez y se desmonta al cerrar. */
  useEffect(() => {
    if (!open) return;
    let disposed = false;
    let teardown: (() => void) | undefined;

    void (async () => {
      const THREE = await import('three');
      const host = mountRef.current;
      if (disposed || !host) return;

      const width = () => host.clientWidth || 1;
      const height = () => host.clientHeight || 1;

      let renderer: import('three').WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      } catch {
        if (!disposed) setFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width(), height());
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.touchAction = 'none';
      renderer.domElement.style.cursor = 'grab';
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, width() / height(), 1, 1100);

      const geometry = new THREE.SphereGeometry(500, 60, 40);
      geometry.scale(-1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ color: 0x0b080a });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const disposeBase = () => {
        material.map?.dispose();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };

      let texture: import('three').Texture | null = null;
      try {
        texture = await new THREE.TextureLoader().loadAsync(src);
      } catch {
        if (!disposed) setFailed(true);
        disposeBase();
        return;
      }
      if (disposed) {
        texture.dispose();
        disposeBase();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.LinearFilter;
      /*
       * Sin mipmaps los bordes de la esfera (ángulo rasante) se
       * submuestrean y quedan borrosos/temblando al arrastrar.
       * Los mipmaps + filtrado anisotrópico mantienen nítido el
       * panorama en cualquier dirección de vista.
       */
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      material.map = texture;
      material.color.set(0xffffff);
      material.needsUpdate = true;

      const state = {
        lon: 0,
        lat: 0,
        fov: 75,
        dragging: false,
        pointerId: -1,
        startX: 0,
        startY: 0,
        startLon: 0,
        startLat: 0,
        lastX: 0,
        lastY: 0,
        /** rad/s equivalente en grados por milisegundo */
        velLon: 0,
        velLat: 0,
        lastMoveAt: 0,
        lastFrameAt: performance.now(),
        lastInteraction: 0,
        pinch: 0,
        gyro: false,
        gyroOrigin: 0,
      };

      const markInteraction = () => {
        state.lastInteraction = performance.now();
        if (!hintShownRef.current) {
          hintShownRef.current = true;
          setHinted(true);
        }
      };

      /* ---- puntero (ratón / táctil) ---- */
      const onPointerDown = (e: PointerEvent) => {
        state.dragging = true;
        state.pointerId = e.pointerId;
        state.startX = e.clientX;
        state.startY = e.clientY;
        state.lastX = e.clientX;
        state.lastY = e.clientY;
        state.startLon = state.lon;
        state.startLat = state.lat;
        state.velLon = 0;
        state.velLat = 0;
        state.lastMoveAt = performance.now();
        renderer.domElement.style.cursor = 'grabbing';
        renderer.domElement.setPointerCapture?.(e.pointerId);
        markInteraction();
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!state.dragging || e.pointerId !== state.pointerId) return;
        const now = performance.now();
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;
        const stepX = e.clientX - state.lastX;
        const stepY = e.clientY - state.lastY;
        const dt = Math.max(8, Math.min(64, now - state.lastMoveAt));
        const k = DRAG_K * (state.fov / 75);
        state.lon = state.startLon - dx * k;
        state.lat = clampLat(state.startLat + dy * k);
        /* Velocidad real de este frame (grados/ms) para la inercia. */
        state.velLon = (-stepX * k) / dt;
        state.velLat = (stepY * k) / dt;
        state.lastX = e.clientX;
        state.lastY = e.clientY;
        state.lastMoveAt = now;
        markInteraction();
      };

      const endDrag = (e: PointerEvent) => {
        if (e.pointerId !== state.pointerId) return;
        state.dragging = false;
        state.pointerId = -1;
        renderer.domElement.style.cursor = 'grab';
      };

      /* ---- rueda y pellizco ---- */
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        state.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, state.fov + e.deltaY * 0.05));
        camera.fov = state.fov;
        camera.updateProjectionMatrix();
        markInteraction();
      };

      const distances = new Map<number, { x: number; y: number }>();
      const onPointerDownPinch = (e: PointerEvent) => {
        distances.set(e.pointerId, { x: e.clientX, y: e.clientY });
      };
      const onPointerMovePinch = (e: PointerEvent) => {
        if (!distances.has(e.pointerId)) return;
        distances.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (distances.size !== 2) return;
        const [a, b] = [...distances.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (state.pinch) {
          state.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, state.fov - (dist - state.pinch) * 0.35));
          camera.fov = state.fov;
          camera.updateProjectionMatrix();
        }
        state.pinch = dist;
        markInteraction();
      };
      const onPointerUpPinch = (e: PointerEvent) => {
        distances.delete(e.pointerId);
        if (distances.size < 2) state.pinch = 0;
      };

      /* ---- giroscopio (móvil) ---- */
      const onOrientation = (e: DeviceOrientationEvent) => {
        if (!state.gyro || e.alpha === null || e.beta === null) return;
        if (state.gyroOrigin === 0) state.gyroOrigin = e.alpha;
        state.lon = -(e.alpha - state.gyroOrigin);
        state.lat = Math.max(-85, Math.min(85, e.beta - 90));
        markInteraction();
      };

      const setGyro = async (on: boolean): Promise<boolean> => {
        const DOE = window.DeviceOrientationEvent as unknown as
          | { requestPermission?: () => Promise<string> }
          | undefined;
        if (on) {
          if (DOE?.requestPermission) {
            try {
              const res = await DOE.requestPermission();
              if (res !== 'granted') return false;
            } catch {
              return false;
            }
          }
          state.gyroOrigin = 0;
          state.gyro = true;
          window.addEventListener('deviceorientation', onOrientation, true);
          return true;
        }
        state.gyro = false;
        window.removeEventListener('deviceorientation', onOrientation, true);
        return false;
      };

      const fullscreen = () => {
        const el = host.parentElement;
        if (!el) return;
        if (document.fullscreenElement) void document.exitFullscreen();
        else void el.requestFullscreen?.();
      };

      const reset = () => {
        state.lon = 0;
        state.lat = 0;
        state.fov = 75;
        state.velLon = 0;
        state.velLat = 0;
        camera.fov = 75;
        camera.updateProjectionMatrix();
        markInteraction();
      };

      apiRef.current = { fullscreen, reset, setGyro };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointermove', onPointerMove);
      renderer.domElement.addEventListener('pointerup', endDrag);
      renderer.domElement.addEventListener('pointercancel', endDrag);
      renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
      renderer.domElement.addEventListener('pointerdown', onPointerDownPinch);
      renderer.domElement.addEventListener('pointermove', onPointerMovePinch);
      renderer.domElement.addEventListener('pointerup', onPointerUpPinch);
      renderer.domElement.addEventListener('pointercancel', onPointerUpPinch);

      const resizeObserver = new ResizeObserver(() => {
        camera.aspect = width() / height();
        camera.updateProjectionMatrix();
        renderer.setSize(width(), height());
      });
      resizeObserver.observe(host);

      let frame = 0;
      const target = new THREE.Vector3();
      const animate = () => {
        frame = requestAnimationFrame(animate);
        const now = performance.now();
        const dt = Math.min(64, Math.max(1, now - state.lastFrameAt));
        state.lastFrameAt = now;

        if (!state.dragging) {
          const sinceMove = now - state.lastMoveAt;
          /*
           * Inercia tras soltar: se integra la velocidad medida durante
           * el arrastre con decaimiento suave. Antes se sumaba un delta
           * fijo por frame, lo que producía un empujón desproporcionado.
           */
          if (sinceMove < INERTIA_MS && (state.velLon !== 0 || state.velLat !== 0)) {
            const decay = Math.pow(1 - sinceMove / INERTIA_MS, 2);
            state.lon += state.velLon * dt * INERTIA_GAIN * decay;
            state.lat = clampLat(state.lat + state.velLat * dt * INERTIA_GAIN * decay);
            const damp = Math.exp(-dt / 200);
            state.velLon *= damp;
            state.velLat *= damp;
          } else {
            state.velLon = 0;
            state.velLat = 0;
            /* Rotación lenta en reposo, como Facebook. */
            if (!state.gyro && now - state.lastInteraction > IDLE_MS) {
              state.lon += 0.05 * (dt / 16.67);
            }
          }
        } else if (now - state.lastMoveAt > 60) {
          /* El puntero está detenido: no debe quedar velocidad residual. */
          state.velLon = 0;
          state.velLat = 0;
        }

        state.lat = clampLat(state.lat);

        const phi = THREE.MathUtils.degToRad(90 - state.lat);
        const theta = THREE.MathUtils.degToRad(state.lon);
        target.set(
          500 * Math.sin(phi) * Math.cos(theta),
          500 * Math.cos(phi),
          500 * Math.sin(phi) * Math.sin(theta),
        );
        camera.lookAt(target);
        renderer.render(scene, camera);
      };
      animate();
      setReady(true);

      teardown = () => {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        setGyro(false);
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer.domElement.removeEventListener('pointermove', onPointerMove);
        renderer.domElement.removeEventListener('pointerup', endDrag);
        renderer.domElement.removeEventListener('pointercancel', endDrag);
        renderer.domElement.removeEventListener('wheel', onWheel);
        renderer.domElement.removeEventListener('pointerdown', onPointerDownPinch);
        renderer.domElement.removeEventListener('pointermove', onPointerMovePinch);
        renderer.domElement.removeEventListener('pointerup', onPointerUpPinch);
        renderer.domElement.removeEventListener('pointercancel', onPointerUpPinch);
        texture?.dispose();
        disposeBase();
        apiRef.current = null;
      };
    })();

    return () => {
      disposed = true;
      teardown?.();
    };
  }, [open, src]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group/pano relative block h-full w-full cursor-pointer"
        aria-label={`Abrir tour 360 de ${title ?? 'el espacio'}`}
      >
        {trigger}
        <span className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white opacity-90 backdrop-blur-md transition-opacity duration-300 group-hover/pano:opacity-100">
          <Compass className="h-3.5 w-3.5 text-[#e3bd74]" />
          <span>Tour 360</span>
        </span>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-0 backdrop-blur-md sm:p-6">
            <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0b080a] sm:h-auto sm:max-h-[92vh] sm:max-w-6xl sm:rounded-2xl sm:border sm:border-white/15 sm:shadow-[0_32px_120px_rgba(0,0,0,0.8)]">
              {/* Header */}
              <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.03] px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-extrabold uppercase tracking-wide text-white">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7a1f3d] px-2.5 py-0.5 text-[10px] tracking-[0.16em] text-[#e3bd74]">
                      360°
                    </span>
                    <span className="truncate">{title ?? 'Tour 360'}</span>
                  </p>
                  <p className="truncate text-[11px] uppercase tracking-[0.18em] text-[#e3bd74]/90">
                    {subtitle ?? 'Arrastra para mirar a tu alrededor'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={enableGyro}
                    className={`rounded-lg p-2 transition-colors ${
                      gyroOn ? 'bg-[#7a1f3d] text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                    aria-label="Usar el giroscopio del celular"
                    title="Giroscopio"
                  >
                    <Smartphone className="h-4.5 w-4.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => apiRef.current?.reset()}
                    className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Restablecer vista"
                    title="Restablecer vista"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => apiRef.current?.fullscreen()}
                    className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Pantalla completa"
                    title="Pantalla completa"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  <span className="mx-1 h-5 w-px bg-white/15" />
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-[#7a1f3d]"
                    aria-label="Cerrar"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Visor */}
              <div className="relative min-h-[55vh] w-full flex-1 touch-none select-none sm:min-h-[60vh]">
                <div ref={mountRef} className="absolute inset-0 h-full w-full" />

                {!ready && !failed && (
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
                      Cargando tour 360…
                    </span>
                  </div>
                )}

                {failed && (
                  <div className="absolute inset-0 grid place-items-center px-6 text-center">
                    <div className="space-y-2">
                      <ImageOff className="mx-auto h-8 w-8 text-[#e3bd74]" />
                      <p className="text-sm font-bold text-white">No se pudo cargar el tour 360</p>
                      <p className="text-xs text-white/55">Probá de nuevo en unos segundos.</p>
                    </div>
                  </div>
                )}

                {ready && !hinted && (
                  <span className="pointer-events-none absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur-md">
                    Arrastrá para mirar a tu alrededor
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex flex-col gap-2 border-t border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-xs text-white/55">
                  Arrastrá con el mouse o el dedo · rueda o pellizco para acercar
                  {gyroOn ? ' · giroscopio activo' : ''}
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl bg-[#7a1f3d] px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#8f2547]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
