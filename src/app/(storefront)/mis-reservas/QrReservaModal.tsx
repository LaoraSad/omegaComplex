"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, Loader2, X } from "lucide-react";
import QRCode from "qrcode";
import { QRCodeSVG } from "qrcode.react";

type QrReserva = {
  id: string;
  seqNo: number;
  status: string;
  codigo: string | null;
  codigoTexto: string | null;
  nombre: string;
  servicio: string;
  zona: string;
};

type RespuestaQrs = {
  qrs: QrReserva[];
  noDisponibles: number;
};

const POR_PAGINA = 4;

function mensajeDeRespuesta(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }
  return "No se pudieron cargar los códigos QR.";
}

function descargarArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function estadoQr(status: string) {
  if (status === "active") return { label: "Vigente", tone: "text-emerald-200" };
  if (status === "used") return { label: "Usado", tone: "text-blue-200" };
  return { label: "Expirado", tone: "text-white/50" };
}

export default function QrReservaModal({
  reservationId,
  serviceName,
  onClose,
}: {
  reservationId: string;
  serviceName: string;
  onClose: () => void;
}) {
  const [respuesta, setRespuesta] = useState<RespuestaQrs | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [descargando, setDescargando] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    async function cargarQrs() {
      setCargando(true);
      setError("");
      try {
        const response = await fetch(`/api/reservations/${reservationId}/qrs`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(mensajeDeRespuesta(payload));
        if (
          !payload ||
          typeof payload !== "object" ||
          !("data" in payload) ||
          !payload.data ||
          typeof payload.data !== "object" ||
          !("qrs" in payload.data) ||
          !Array.isArray(payload.data.qrs)
        ) {
          throw new Error("La respuesta del servidor no tiene un formato válido.");
        }
        setRespuesta(payload.data as RespuestaQrs);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "No se pudieron cargar los códigos QR.");
        }
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }
    void cargarQrs();
    return () => controller.abort();
  }, [reservationId]);

  const totalPaginas = Math.ceil((respuesta?.qrs.length ?? 0) / POR_PAGINA);
  const qrsVisibles = useMemo(() => {
    const qrs = respuesta?.qrs ?? [];
    return qrs.length >= 5
      ? qrs.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
      : qrs;
  }, [pagina, respuesta]);

  async function descargarQr(qr: QrReserva) {
    if (!qr.codigo) return;
    setDescargando(qr.id);
    setError("");
    try {
      const svg = await QRCode.toString(qr.codigo, {
        type: "svg",
        width: 360,
        margin: 2,
        color: { dark: "#171216", light: "#ffffff" },
      });
      descargarArchivo(
        new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
        `pase-${qr.seqNo}.svg`,
      );
    } catch {
      setError(`No se pudo generar la descarga del pase #${qr.seqNo}.`);
    } finally {
      setDescargando(null);
    }
  }

  async function descargarTodos() {
    setDescargando("todos");
    setError("");
    try {
      const response = await fetch(`/api/reservations/${reservationId}/qrs?format=pdf`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const payload: unknown = await response.json();
        throw new Error(mensajeDeRespuesta(payload));
      }
      descargarArchivo(await response.blob(), `pases-${reservationId.slice(0, 8)}.pdf`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron descargar los pases.");
    } finally {
      setDescargando(null);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-120 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#141013] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 id="qr-modal-title" className="text-base font-black text-white sm:text-lg">
              Pases QR
            </h2>
            <p className="truncate text-xs text-white/55">{serviceName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="Cerrar ventana de códigos QR"
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-6">
          {cargando ? (
            <p role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-white/70">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando pases…
            </p>
          ) : error && !respuesta ? (
            <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
              {error}
            </p>
          ) : respuesta && respuesta.qrs.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/60">
              Esta reserva no tiene códigos QR emitidos.
            </p>
          ) : (
            <>
              {respuesta?.noDisponibles ? (
                <p className="mb-4 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-100">
                  {respuesta.noDisponibles} pase(s) antiguo(s) no se pueden mostrar ni descargar porque
                  no tienen código recuperable.
                </p>
              ) : null}

              {error ? (
                <p role="alert" className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">
                  {error}
                </p>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {qrsVisibles.map((qr) => {
                  const estado = estadoQr(qr.status);
                  return (
                    <article
                      key={qr.id}
                      className="flex min-w-0 flex-col items-center rounded-xl border border-white/10 bg-white/[0.035] p-4 text-center"
                    >
                      <div className="flex w-full items-center justify-between gap-2 text-left">
                        <p className="text-sm font-black text-white">Pase #{qr.seqNo}</p>
                        <span className={`text-xs font-bold ${estado.tone}`}>{estado.label}</span>
                      </div>
                      {qr.codigo ? (
                        <div className="my-4 rounded-lg bg-white p-3">
                          <QRCodeSVG value={qr.codigo} size={168} level="M" />
                        </div>
                      ) : (
                        <p className="my-4 flex min-h-48.5 items-center justify-center rounded-lg bg-white/6 px-5 text-xs text-white/50">
                          Código no disponible para este pase antiguo.
                        </p>
                      )}
                      <p className="text-sm font-semibold text-white/90">{qr.nombre}</p>
                      <p className="mt-1 text-xs text-white/55">
                        {qr.servicio} · {qr.zona}
                      </p>
                      {qr.codigoTexto ? (
                        <p className="mt-3 font-mono text-sm font-bold tracking-wider text-[#e3bd74]">
                          {qr.codigoTexto}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void descargarQr(qr)}
                        disabled={!qr.codigo || descargando !== null}
                        className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {descargando === qr.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Descargar QR
                      </button>
                    </article>
                  );
                })}
              </div>

              {respuesta && respuesta.qrs.length >= 5 ? (
                <nav
                  aria-label="Paginación de códigos QR"
                  className="mt-5 flex items-center justify-center gap-4"
                >
                  <button
                    type="button"
                    onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                    disabled={pagina <= 1}
                    aria-label="Página anterior"
                    className="rounded-lg border border-white/15 p-2 text-white hover:bg-white/10 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-semibold text-white/70">
                    Página {pagina} de {totalPaginas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}
                    disabled={pagina >= totalPaginas}
                    aria-label="Página siguiente"
                    className="rounded-lg border border-white/15 p-2 text-white hover:bg-white/10 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              ) : null}
            </>
          )}
        </div>

        {respuesta && respuesta.qrs.some((qr) => qr.codigo) ? (
          <footer className="border-t border-white/10 px-5 py-4">
            <button
              type="button"
              onClick={() => void descargarTodos()}
              disabled={descargando !== null}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#7a1f3d] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#631730] disabled:cursor-wait disabled:opacity-60"
            >
              {descargando === "todos" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Descargar todos los pases (PDF)
            </button>
          </footer>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
