"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// ---------------------------------------------------------------------------
// Lector de QR con la cámara.
//
// Antes esto era solo un <video>: se veía la cámara pero nadie leía el código,
// así que el empleado tenía que teclear el token de 32 caracteres. Ahora se
// decodifica cada cuadro con jsQR y, en cuanto aparece un QR, se entrega el
// texto y se apaga la cámara.
//
// Decisiones:
//   - se analiza a 480px de ancho: sobra para un QR impreso y no quema el
//     teléfono del empleado que está de turno;
//   - se limita a ~10 cuadros por segundo por el mismo motivo;
//   - el mismo texto no se repite hasta que el empleado cambie de persona,
//     para no leer el mismo QR en bucle.
// ---------------------------------------------------------------------------

const ANCHO_MAXIMO = 480;
const INTERVALO_MS = 100;

export type EstadoCamara = "apagada" | "pidiendo" | "activa" | "error";

export type LectorQr = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  estado: EstadoCamara;
  error: string | null;
  iniciar: () => Promise<void>;
  detener: () => void;
  /** Permite volver a leer el mismo QR sin reiniciar la cámara. */
  limpiarUltimo: () => void;
};

export function useQrScanner(alLeer: (texto: string) => void): LectorQr {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const ultimoRef = useRef<{ texto: string; en: number } | null>(null);

  const [estado, setEstado] = useState<EstadoCamara>("apagada");
  const [error, setError] = useState<string | null>(null);

  // La referencia al callback cambia en cada render; se guarda en un ref para
  // que el bucle de lectura no se reinicie por eso.
  const alLeerRef = useRef(alLeer);
  useEffect(() => {
    alLeerRef.current = alLeer;
  }, [alLeer]);

  const detener = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setEstado("apagada");
  }, []);

  // Al salir de la pantalla la cámara se apaga: deja de consumir batería.
  useEffect(() => () => detener(), [detener]);

  const iniciar = useCallback(async () => {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setEstado("error");
      setError("Este navegador no permite usar la cámara. Escribe el código a mano.");
      return;
    }

    setEstado("pidiendo");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (e) {
      setEstado("error");
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Autorízalo en el navegador o escribe el código."
          : "No se pudo activar la cámara. Escribe el código a mano.",
      );
      return;
    }

    streamRef.current = stream;
    setEstado("activa");

    // El <video> se monta después de este render: se engancha en el siguiente.
    requestAnimationFrame(() => {
      const video = videoRef.current;
      if (!video || !streamRef.current) {
        detener();
        return;
      }
      video.srcObject = stream;
      void video.play().catch(() => undefined);
      leer();
    });

    let ultimoProcesado = 0;

    function leer() {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || !streamRef.current) return;

      rafRef.current = requestAnimationFrame(leer);

      if (video.readyState < video.HAVE_CURRENT_DATA || !video.videoWidth) return;

      // ~10 cuadros por segundo: suficiente para leer un QR impreso.
      const ahora = performance.now();
      if (ahora - ultimoProcesado < INTERVALO_MS) return;
      ultimoProcesado = ahora;

      const escala = Math.min(1, ANCHO_MAXIMO / video.videoWidth);
      const ancho = Math.max(1, Math.round(video.videoWidth * escala));
      const alto = Math.max(1, Math.round(video.videoHeight * escala));
      canvas.width = ancho;
      canvas.height = alto;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, ancho, alto);
      const imagen = ctx.getImageData(0, 0, ancho, alto);
      const encontrado = jsQR(imagen.data, ancho, alto, { inversionAttempts: "attemptBoth" });
      const texto = encontrado?.data?.trim();
      if (!texto) return;

      // No repetir el mismo QR: el empleado puede tener a dos personas con el
      // mismo teléfono o repetir el escaneo sin querer.
      const repetido =
        ultimoRef.current !== null &&
        ultimoRef.current.texto === texto &&
        ahora - ultimoRef.current.en < 4000;
      if (repetido) return;

      ultimoRef.current = { texto, en: ahora };
      detener();
      alLeerRef.current(texto);
    }
  }, [detener]);

  const limpiarUltimo = useCallback(() => {
    ultimoRef.current = null;
  }, []);

  return { videoRef, canvasRef, estado, error, iniciar, detener, limpiarUltimo };
}