"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Check,
  Keyboard,
  MapPin,
  ScanLine,
  UserRound,
  X,
} from "lucide-react";
import { formatClock, formatInTimeZone } from "@/features/access/access-dates";
import type { AccessLookup, ReservationSummary, ZoneInfo } from "@/features/access/access.types";

// ---------------------------------------------------------------------------
// Punto de control del empleado.
//
// Dos pasos, nunca automaticos (SCRUM seccion 19):
//   1. Escanear / escribir el token -> el servidor responde la ficha.
//   2. El empleado revisa y pulsa "Dar acceso".
// ---------------------------------------------------------------------------

type State =
  | { phase: "idle" }
  | { phase: "looking" }
  | { phase: "review"; lookup: AccessLookup; token: string }
  | { phase: "granted"; message: string; zone: ZoneInfo | null }
  | { phase: "error"; message: string };

export default function ValidarView() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [manual, setManual] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  // Se detiene la camara al salir del componente: deja de consumir la bateria.
  useEffect(() => stopCamera, [stopCamera]);

  const consult = useCallback(async (token: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/access/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      const lookup = json?.data as AccessLookup | undefined;
      if (!lookup) {
        setState({ phase: "error", message: json?.error?.message ?? "No se pudo validar el QR." });
        return;
      }
      if (lookup.outcome === "allowed") {
        setState({ phase: "review", lookup, token });
      } else {
        setState({
          phase: "review",
          token,
          lookup: {
            ...lookup,
            // El intento denegado ya quedo registrado; se muestra la ficha si la hay.
          },
        });
      }
    } catch {
      setState({ phase: "error", message: "Sin conexión con el servidor." });
    } finally {
      setBusy(false);
    }
  }, []);

  const grant = useCallback(async (token: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/access/validate?action=confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (json?.data?.outcome === "granted") {
        const grantData = json.data.grant;
        setState({
          phase: "granted",
          message: `Ingreso de ${grantData.customerName} registrado.`,
          zone: grantData.zone ?? null,
        });
        stopCamera();
        return;
      }
      setState({
        phase: "review",
        token,
        lookup: { outcome: "denied", denial: json?.data?.denial ?? { code: "qr_invalido", message: "No se pudo dar acceso." } },
      });
    } catch {
      setState({ phase: "error", message: "Sin conexión con el servidor." });
    } finally {
      setBusy(false);
    }
  }, [stopCamera]);

  async function toggleCamera() {
    if (cameraOn) {
      stopCamera();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState({ phase: "error", message: "Este navegador no permite usar la cámara." });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      setState({ phase: "idle" });
      // El <video> solo existe tras el render, se engancha en el siguiente ciclo.
      requestAnimationFrame(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        void videoRef.current.play();
      });
    } catch {
      setState({
        phase: "error",
        message: "No se pudo activar la cámara. Revisa el permiso del navegador o escribe el código.",
      });
    }
  }

  function reset() {
    stopCamera();
    setState({ phase: "idle" });
    setManual("");
  }

  // --- Presentacion -------------------------------------------------------

  if (state.phase === "granted") {
    return (
      <Card tone="ok">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
            <Check className="h-8 w-8" />
          </span>
          <h2 className="text-xl font-extrabold text-white">Acceso concedido</h2>
          <p className="text-sm text-white/70">{state.message}</p>
          {state.zone ? (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-white/50">
              <MapPin className="h-3.5 w-3.5" />
              {state.zone.serviceName}
            </p>
          ) : null}
          <p className="text-xs text-white/40">
            Queda registrado con tu usuario y la hora exacta. El QR no volvera a servir.
          </p>
          <button type="button" onClick={reset} className={primaryBtn}>
            Validar otro QR
          </button>
        </div>
      </Card>
    );
  }

  if (state.phase === "review" && state.lookup) {
    const denied = state.lookup.outcome === "denied";
    const reservation = state.lookup.reservation;
    return (
      <div className="space-y-4">
        <Card tone={denied ? "bad" : "warn"}>
          <div className="flex items-start gap-3">
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                denied ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {denied ? <X className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-white">
                {denied ? "Acceso denegado" : "Revisar antes de dar acceso"}
              </h2>
              <p className="mt-0.5 text-sm text-white/70">{state.lookup.denial?.message}</p>
            </div>
          </div>
        </Card>

        {reservation ? <ReservationCard reservation={reservation} /> : null}

        {state.lookup.outsideEmployeeZone ? (
          <Card tone="info">
            <p className="text-sm font-bold text-white">
              Esta reserva es de otra zona
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/65">
              Debes acompanarlo a <strong className="text-[#e3bd74]">{state.lookup.outsideEmployeeZone.reservationZone.serviceName}</strong>.
              No se deniega el acceso, solo se indica a donde conducting.
            </p>
          </Card>
        ) : null}

        {denied ? (
          <button type="button" onClick={reset} className={primaryBtn}>
            Volver a escanear
          </button>
        ) : (
          <ConfirmPanel
            busy={busy}
            onCancel={reset}
            onConfirm={() => grant(state.token)}
          />
        )}
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <Card tone="bad">
        <p className="text-sm text-white/80">{state.message}</p>
        <button type="button" onClick={reset} className={`${primaryBtn} mt-4`}>
          Reintentar
        </button>
      </Card>
    );
  }

  // --- Inicio: escaner o codigo manual ------------------------------------

  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Validar QR</h1>
        <p className="text-sm text-white/55">
          Escanea el codigo del cliente y revisa la ficha antes de darle acceso.
        </p>
      </section>

      <Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/45">
              <Camera className="h-3.5 w-3.5" />
              Camara
            </p>
            <button
              type="button"
              onClick={toggleCamera}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white"
            >
              {cameraOn ? (
                <>
                  <CameraOff className="h-3.5 w-3.5" />
                  Apagar
                </>
              ) : (
                <>
                  <Camera className="h-3.5 w-3.5" />
                  Encender
                </>
              )}
            </button>
          </div>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${cameraOn ? "" : "opacity-0"}`}
            />
            {!cameraOn ? (
              <div className="absolute inset-0 grid place-items-center text-center">
                <div className="space-y-2 px-6">
                  <ScanLine className="mx-auto h-8 w-8 text-white/25" />
                  <p className="text-xs text-white/40">
                    Camara apagada. Activala para leer el QR o escribe el codigo abajo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-[#c8a96b]/70" />
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <p className="text-[0.7rem] leading-relaxed text-white/35">
            El lector automatico requiere un decodificador de QR en el navegador. Si no esta
            disponible en este equipo, usa el ingreso manual.
          </p>
        </div>
      </Card>

      <Card>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const token = manual.trim();
            if (token) void consult(token);
          }}
        >
          <label
            htmlFor="token"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/45"
          >
            <Keyboard className="h-3.5 w-3.5" />
            Codigo del QR
          </label>
          <div className="flex gap-2">
            <input
              id="token"
              value={manual}
              onChange={(event) => setManual(event.target.value)}
              placeholder="Pega o escribe el codigo"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-[#c8a96b] focus:outline-none"
            />
            <button type="submit" disabled={busy || !manual.trim()} className={primaryBtn}>
              {busy ? "Buscando…" : "Consultar"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Piezas de presentacion
// ---------------------------------------------------------------------------

function ReservationCard({ reservation }: { reservation: ReservationSummary }) {
  return (
    <Card>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/45">
        <UserRound className="h-3.5 w-3.5" />
        Cliente
      </p>
      <p className="mt-1 text-lg font-extrabold text-white">{reservation.customerName}</p>
      {reservation.customerDocument ? (
        <p className="text-xs text-white/55">Documento {reservation.customerDocument}</p>
      ) : null}

      <dl className="mt-4 space-y-2 text-sm">
        <Row label="Servicio" value={reservation.zone.serviceName} />
        <Row label="Categoria" value={reservation.zone.categoryName} />
        <Row
          label="Franja"
          value={`${formatInTimeZone(reservation.startsAt, "d MMM yyyy")}, ${formatClock(reservation.startsAt)} a ${formatClock(reservation.endsAt)}`}
        />
        <Row label="QR" value={`#${reservation.seqNo} · ${reservation.status}`} />
        <Row label="Cupos" value={String(reservation.quantity)} />
      </dl>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-white/45">{label}</dt>
      <dd className="text-right font-semibold text-white/85">{value}</dd>
    </div>
  );
}

/** Confirmacion explicita del ingreso (seccion 19: nunca es automatico). */
function ConfirmPanel({
  busy,
  onConfirm,
  onCancel,
}: {
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Card>
      <p className="text-sm font-bold text-white">Confirmar ingreso</p>
      <p className="mt-1 text-xs leading-relaxed text-white/60">
        Verifica que la persona esta en la zona correcta y que la franja coincide. Al confirmar, el
        QR queda usado y no volvera a servir.
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`${primaryBtn} flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60`}
        >
          <Check className="h-4 w-4" />
          {busy ? "Registrando…" : "Dar acceso"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/70 hover:border-white/30 hover:text-white disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Utilidades visuales
// ---------------------------------------------------------------------------

const TONES = {
  ok: "border-emerald-400/30 bg-emerald-500/10",
  warn: "border-amber-400/30 bg-amber-500/10",
  bad: "border-rose-400/30 bg-rose-500/10",
  info: "border-sky-400/30 bg-sky-500/10",
} as const;

function Card({
  tone = "info",
  children,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return <div className={`rounded-2xl border p-4 ${TONES[tone]}`}>{children}</div>;
}

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#7a1f3d] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#631730] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";