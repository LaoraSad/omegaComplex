"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Camera,
  CameraOff,
  Check,
  Keyboard,
  MapPin,
  ScanLine,
  Ticket,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { formatClock, formatInTimeZone } from "@/features/access/access-dates";
import { useQrScanner } from "@/features/access/use-qr-scanner";
import type { AccessLookup, ReservationSummary, ZoneInfo } from "@/features/access/access.types";

// ---------------------------------------------------------------------------
// Punto de control del empleado.
//
// Dos pasos, nunca automáticos 
//   1. Escanear con la cámara o escribir el código -> el servidor responde la
//      ficha de la persona.
//   2. El empleado compara la foto con quien tiene enfrente y decide.
//
// El código corto del correo es el mismo acceso que el QR: si la cámara falla,
// el cliente no se queda afuera.
// ---------------------------------------------------------------------------

type State =
  | { phase: "idle" }
  | { phase: "looking" }
  | { phase: "review"; lookup: AccessLookup; token: string }
  | { phase: "granted"; message: string; zone: ZoneInfo | null }
  | { phase: "denied"; message: string }
  | { phase: "error"; message: string };

/** Por qué negaría el empleado el acceso, de un clic y sin teclear. */
const MOTIVOS_DENEGACION = [
  "La persona no coincide con la foto de la ficha",
  "La zona está cerrada o no aplica hoy",
  "El código no pertenece a este grupo",
  "Otro motivo",
];

export default function ValidarView() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVOS_DENEGACION[0]);
  const [mostrarMotivo, setMostrarMotivo] = useState(false);

  const consult = useCallback(async (token: string) => {
    setBusy(true);
    setState({ phase: "looking" });
    try {
      const res = await fetch("/api/access/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      const lookup = json?.data as AccessLookup | undefined;
      if (!lookup) {
        setState({ phase: "error", message: json?.error?.message ?? "No se pudo validar el código." });
        return;
      }
      setState({ phase: "review", lookup, token });
    } catch {
      setState({ phase: "error", message: "Sin conexión con el servidor." });
    } finally {
      setBusy(false);
    }
  }, []);

  const alLeerQr = useCallback(
    (texto: string) => {
      void consult(texto);
    },
    [consult],
  );

  const {
  videoRef,
  canvasRef,
  estado: estadoCamara,
  error: errorCamara,
  iniciar: iniciarCamara,
  detener: detenerCamara,
  limpiarUltimo,
} = useQrScanner(alLeerQr);

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
          message: `Ingreso de ${grantData.personName ?? grantData.customerName} registrado.`,
          zone: grantData.zone ?? null,
        });
        detenerCamara();
        return;
      }
      setState({
        phase: "review",
        token,
        lookup: {
          outcome: "denied",
          denial: json?.data?.denial ?? { code: "qr_invalido", message: "No se pudo dar acceso." },
        },
      });
    } catch {
      setState({ phase: "error", message: "Sin conexión con el servidor." });
    } finally {
      setBusy(false);
    }
  }, [detenerCamara]);

  const deny = useCallback(
    async (token: string) => {
      setBusy(true);
      try {
        const res = await fetch("/api/access/validate?action=deny", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, reason: motivo }),
        });
        const json = await res.json();
        const denial = json?.data?.denial as { message?: string } | undefined;
        detenerCamara();
        setState({
          phase: "denied",
          message: denial?.message ?? "Acceso denegado y registrado.",
        });
      } catch {
        setState({ phase: "error", message: "Sin conexión con el servidor." });
      } finally {
        setBusy(false);
      }
    },
    [detenerCamara, motivo],
  );

  function reset() {
    detenerCamara();
    limpiarUltimo();
    setState({ phase: "idle" });
    setManual("");
    setMostrarMotivo(false);
    setMotivo(MOTIVOS_DENEGACION[0]);
  }

  // Mientras se está mostrando una ficha no interesa tener la cámara encendida.
  useEffect(() => {
    if (state.phase !== "idle" && estadoCamara === "activa") detenerCamara();
  }, [state.phase, estadoCamara, detenerCamara]);

  // --- Presentación -------------------------------------------------------

  if (state.phase === "granted") {
    return (
      <Card tone="ok">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
            <Check className="h-8 w-8" />
          </span>
          <h2 className="text-xl font-extrabold text-white">Acceso concedido</h2>
          <p className="text-sm text-white/80">{state.message}</p>
          {state.zone ? (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
              <MapPin className="h-3.5 w-3.5" />
              {state.zone.serviceName}
            </p>
          ) : null}
          <p className="text-xs text-white/45">
            Queda registrado con tu usuario y la hora exacta. El QR no volverá a servir.
          </p>
          <button type="button" onClick={reset} className={primaryBtn}>
            Validar el siguiente
          </button>
        </div>
      </Card>
    );
  }

  if (state.phase === "denied") {
    return (
      <Card tone="bad">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-rose-500/15 text-rose-300">
            <Ban className="h-8 w-8" />
          </span>
          <h2 className="text-xl font-extrabold text-white">Acceso denegado</h2>
          <p className="text-sm text-white/80">{state.message}</p>
          <p className="text-xs text-white/45">
            Quedó registrado a tu nombre en Accesos, con el motivo. El código no vuelve a servir.
          </p>
          <button type="button" onClick={reset} className={primaryBtn}>
            Validar el siguiente
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
                {denied ? "No se puede dar acceso" : "Revisar antes de dar acceso"}
              </h2>
              <p className="mt-0.5 text-sm text-white/80">{state.lookup.denial?.message}</p>
            </div>
          </div>
        </Card>

        {reservation ? <FichaPersona reservation={reservation} /> : null}

        {state.lookup.outsideEmployeeZone ? (
          <Card tone="info">
            <p className="text-sm font-bold text-white">Esta reserva es de otra zona</p>
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              Debes acompañarlo a{" "}
              <strong className="text-[#e3bd74]">{state.lookup.outsideEmployeeZone.reservationZone.serviceName}</strong>.
              No se deniega el acceso, solo se indica a dónde conducirlo.
            </p>
          </Card>
        ) : null}

        {denied ? (
          <button type="button" onClick={reset} className={primaryBtn}>
            Volver atrás
          </button>
        ) : (
          <ConfirmPanel
            busy={busy}
            motivo={motivo}
            mostrarMotivo={mostrarMotivo}
            onToggleMotivo={() => setMostrarMotivo((v) => !v)}
            onMotivo={setMotivo}
            onCancel={reset}
            onConfirm={() => void grant(state.token)}
            onDeny={() => void deny(state.token)}
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

  if (state.phase === "looking") {
    return (
      <Card tone="info">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/10">
            <ScanLine className="h-7 w-7 animate-pulse text-[#e3bd74]" />
          </span>
          <p className="text-sm font-semibold text-white">Consultando el código…</p>
        </div>
      </Card>
    );
  }

  // --- Inicio: escáner o código manual ------------------------------------

  const camaraActiva = estadoCamara === "activa";

  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Validar QR</h1>
        <p className="text-sm text-white/60">
          Escanea el código del cliente y revisa la ficha antes de darle acceso.
        </p>
      </section>

      <Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/55">
              <Camera className="h-3.5 w-3.5" />
              Cámara
            </p>
            <button
              type="button"
              onClick={() => (camaraActiva ? detenerCamara() : void iniciarCamara())}
              disabled={estadoCamara === "pidiendo"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-2.5 py-1 text-xs font-semibold text-white/80 hover:border-white/35 hover:text-white disabled:opacity-50"
            >
              {camaraActiva ? (
                <>
                  <CameraOff className="h-3.5 w-3.5" />
                  Apagar
                </>
              ) : (
                <>
                  <Camera className="h-3.5 w-3.5" />
                  {estadoCamara === "pidiendo" ? "Encendiendo…" : "Encender"}
                </>
              )}
            </button>
          </div>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${camaraActiva ? "" : "opacity-0"}`}
            />
            <canvas ref={canvasRef} className="hidden" />
            {!camaraActiva ? (
              <div className="absolute inset-0 grid place-items-center px-6 text-center">
                <div className="space-y-2">
                  <ScanLine className="mx-auto h-8 w-8 text-white/30" />
                  <p className="text-xs text-white/50">
                    {errorCamara ?? "Enciende la cámara para leer el código, o escríbelo abajo."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-[#c8a96b]/70" />
            )}
          </div>
          <p className="text-[0.7rem] leading-relaxed text-white/45">
            El código se lee solo al abrirlo. Si la cámara falla, usa el código corto que aparece en
            el correo y el PDF de la reserva.
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
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/55"
          >
            <Keyboard className="h-3.5 w-3.5" />
            Código corto o contenido del QR
          </label>
          <div className="flex gap-2">
            <input
              id="token"
              value={manual}
              onChange={(event) => setManual(event.target.value.toUpperCase())}
              placeholder="K7M2-XQP4"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-white/20 bg-black/40 px-3 py-2.5 font-mono text-base tracking-[0.18em] text-white placeholder:text-white/30 focus:border-[#c8a96b] focus:outline-none"
            />
            <button type="submit" disabled={busy || !manual.trim()} className={primaryBtn}>
              {busy ? "Buscando…" : "Consultar"}
            </button>
          </div>
          <p className="text-[0.7rem] text-white/45">
            Son 8 caracteres, con guion en el medio. No importa si lo escribes con mayúsculas o
            minúsculas.
          </p>
        </form>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Piezas de presentación
// ---------------------------------------------------------------------------

/**
 * Ficha de quien trae el QR. El nombre va primero porque es lo que el empleado
 * tiene que comprobar contra la persona que está enfrente; el titular de la
 * cuenta se muestra aparte, por si es un acompañante.
 */
function FichaPersona({ reservation }: { reservation: ReservationSummary }) {
  const titular = reservation.customerName.trim().toLowerCase() === reservation.personName.trim().toLowerCase();

  return (
    <Card>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/55">
        <UserRound className="h-3.5 w-3.5" />
        Persona que presenta el código
      </p>
      <p className="mt-1 text-xl font-extrabold text-white">{reservation.personName}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {reservation.personDocument ? (
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-white/75">
            Documento {reservation.personDocument}
          </span>
        ) : null}
        <span className="rounded-full border border-[#c8a96b]/40 bg-[#c8a96b]/10 px-2.5 py-0.5 text-xs font-bold text-[#e3bd74]">
          {reservation.personIsTitular ? "Titular de la reserva" : "Acompañante"}
        </span>
      </div>

      {!titular ? (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-white/60">
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Titular de la reserva: <strong className="text-white/85">{reservation.customerName}</strong>
          {reservation.customerDocument ? ` (${reservation.customerDocument})` : ""}
        </p>
      ) : null}

      <dl className="mt-4 space-y-2 text-sm">
        <Row label="Zona" value={reservation.zone.serviceName} />
        <Row label="Categoría" value={reservation.zone.categoryName} />
        <Row
          label="Franja"
          value={`${formatInTimeZone(reservation.startsAt, "d MMM yyyy")}, ${formatClock(reservation.startsAt)} a ${formatClock(reservation.endsAt)}`}
        />
        <Row label="Código" value={`#${reservation.seqNo} · ${estadoReserva(reservation.status)}`} />
        <Row label="Cupos" value={String(reservation.quantity)} />
      </dl>
    </Card>
  );
}

/** El estado de la reserva se muestra en español, no como lo guarda la base. */
function estadoReserva(status: string): string {
  switch (status) {
    case "confirmed":
      return "confirmada";
    case "pending_payment":
      return "pendiente de pago";
    case "payment_processing":
      return "procesando el pago";
    case "payment_rejected":
      return "rechazada";
    case "expired":
      return "expirada";
    case "used":
      return "utilizada";
    default:
      return status;
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-white/55">{label}</dt>
      <dd className="text-right font-semibold text-white/90">{value}</dd>
    </div>
  );
}

/** Confirmación explícita del ingreso (sección 19: nunca es automático). */
function ConfirmPanel({
  busy,
  motivo,
  mostrarMotivo,
  onToggleMotivo,
  onMotivo,
  onConfirm,
  onDeny,
  onCancel,
}: {
  busy: boolean;
  motivo: string;
  mostrarMotivo: boolean;
  onToggleMotivo: () => void;
  onMotivo: (motivo: string) => void;
  onConfirm: () => void;
  onDeny: () => void;
  onCancel: () => void;
}) {
  return (
    <Card>
      <p className="text-sm font-bold text-white">Confirmar ingreso</p>
      <p className="mt-1 text-xs leading-relaxed text-white/65">
        Comprueba que la persona de la ficha es la que tienes enfrente y que la zona y la franja
        coinciden. Al confirmar, el código queda usado y no vuelve a servir.
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`${primaryBtn} flex-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60`}
        >
          <Check className="h-4 w-4" />
          {busy ? "Registrando…" : "Dar acceso"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/80 hover:border-white/35 hover:text-white disabled:opacity-60"
        >
          Volver atrás
        </button>
      </div>

      <div className="mt-3 border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={onToggleMotivo}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300/90 hover:text-rose-200 disabled:opacity-60"
        >
          <Ticket className="h-3.5 w-3.5" />
          ¿No corresponde? Denegar el acceso
        </button>

        {mostrarMotivo ? (
          <div className="mt-3 space-y-2">
            <label htmlFor="motivo" className="block text-xs font-semibold text-white/65">
              Motivo (lo verá el administrador en Accesos)
            </label>
            <select
              id="motivo"
              value={motivo}
              onChange={(e) => onMotivo(e.target.value)}
              disabled={busy}
              className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-[#c8a96b] focus:outline-none"
            >
              {MOTIVOS_DENEGACION.map((m) => (
                <option key={m} value={m} className="bg-[#171215] text-white">
                  {m}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onDeny}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-800 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
            >
              <Ban className="h-4 w-4" />
              {busy ? "Registrando…" : "Confirmar denegación"}
            </button>
          </div>
        ) : null}
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