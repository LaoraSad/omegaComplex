// Generación del PDF con códigos QR.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

import type { QrParaCorreo } from "@/lib/email/resend";
import { formatShortCode } from "@/features/access/short-code";

/**
 * Arma el PDF con los QR de una reserva.
 *
 * El correo en HTML ya lleva los QR como imágenes, pero para descargar e
 * imprimir (y para no depender del bloquea de imágenes del cliente) se genera
 * además un PDF: una persona por fila, con su etiqueta de zona, el nombre y el
 * servicio, que es justo lo que el empleado necesita leer en la puerta.
 *
 * Los QR se generan como PNG con el mismo `qrcode` que ya usa el correo, así
 * el contenido es idéntico en los dos formatos.
 */

const MARGEN = 48;
const ALTO_PAGINA = 842; // A4 vertical
const ANCHO_PAGINA = 595.28;
/** Alto de cada tarjeta de persona. Toda la tarjeta cabe en este alto. */
const ALTO_TARJETA = 124;
/** Separación entre tarjetas. */
const ALTO_FILA = ALTO_TARJETA + 16;
/** Espacio que ocupa el encabezado en la primera página (banda + título + fecha). */
const ALTO_ENCABEZADO = 214;

/**
 * Filas por pagina. Se calcula una sola vez con el espacio mas JUSTO (la
 * primera pagina, que pierde ademas el encabezado) y se usa el mismo numero en
 * todas: recalcularlo por pagina haria que cada una arrancara en un indice
 * distinto y quedarian filas sin dibujar.
 */
const FILAS_POR_PAGINA = Math.floor(
  (ALTO_PAGINA - MARGEN - ALTO_ENCABEZADO) / ALTO_FILA,
);

export type DatosPdfQr = {
  nombre: string;
  /** Fecha ya formateada para mostrar, igual que va en el correo. */
  fecha: string;
  codigos: QrParaCorreo[];
  /**
   * Documento del titular. El empleado lo necesita para verificar en recepción
   * cuando la imagen no se puede leer.
   */
  documento?: string | null;
};

/**
 * El PDF es la versión imprimible del correo y la que usa el empleado en la
 * puerta: logo, datos de la reserva y el QR escaneable de cada persona.
 */
export async function generarPdfQr(datos: DatosPdfQr): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const normal = await doc.embedFont(StandardFonts.Helvetica);

  const vino = rgb(0.48, 0.12, 0.24);
  const tinta = rgb(0.14, 0.13, 0.14);
  const gris = rgb(0.42, 0.42, 0.42);
  const blanco = rgb(1, 1, 1);

  const total = datos.codigos.length;
  const paginas = Math.max(1, Math.ceil(total / FILAS_POR_PAGINA));

  for (let p = 0; p < paginas; p++) {
    const page = doc.addPage([ANCHO_PAGINA, ALTO_PAGINA]);
    let y = ALTO_PAGINA - MARGEN;

    if (p === 0) {
      // Franja del logo. Es un PNG blanco, así que necesita fondo oscuro.
      const ALTO_BANDA = 62;
      page.drawRectangle({
        x: 0,
        y: ALTO_PAGINA - ALTO_BANDA,
        width: ANCHO_PAGINA,
        height: ALTO_BANDA,
        color: vino,
      });

      try {
        const bytes = await readFile(join(process.cwd(), "public", "Logo-blanco.png"));
        const logo = await doc.embedPng(bytes);
        // El logo mide 640x349: se escala a 132 de ancho para no competir con
        // los QR, que son lo que hay que escanear.
        const anchoLogo = 132;
        page.drawImage(logo, {
          x: MARGEN,
          y: ALTO_PAGINA - ALTO_BANDA / 2 - (anchoLogo * 349) / 640 / 2,
          width: anchoLogo,
          height: (anchoLogo * 349) / 640,
        });
      } catch {
        page.drawText("OMEGA COMPLEX", {
          x: MARGEN,
          y: ALTO_PAGINA - ALTO_BANDA / 2 - 4,
          size: 13,
          font: negrita,
          color: blanco,
        });
      }

      // Encabezado. Cada bloque parte de `y` y se avanza con la altura real que
      // ocupa, en vez de restar números sueltos: así un texto nunca cae dentro
      // del bloque de abajo.
      y = ALTO_PAGINA - ALTO_BANDA - 26;

      page.drawText("Códigos de acceso", {
        x: MARGEN,
        y,
        size: 20,
        font: negrita,
        color: tinta,
      });
      y -= 26;

      page.drawText(
        `${datos.nombre}${datos.documento ? `  ·  Documento ${datos.documento}` : ""}`,
        { x: MARGEN, y, size: 11, font: normal, color: gris },
      );
      y -= 24;

      // Caja de la fecha. `tope` es su borde superior: todo lo de arriba tiene
      // que quedar por encima de ese número.
      const ALTO_CAJA = 46;
      const topeCaja = y;
      page.drawRectangle({
        x: MARGEN,
        y: topeCaja - ALTO_CAJA,
        width: ANCHO_PAGINA - MARGEN * 2,
        height: ALTO_CAJA,
        color: rgb(0.984, 0.969, 0.973),
      });
      page.drawRectangle({
        x: MARGEN,
        y: topeCaja - ALTO_CAJA,
        width: 4,
        height: ALTO_CAJA,
        color: vino,
      });
      page.drawText("FECHA DE LA RESERVA", {
        x: MARGEN + 16,
        y: topeCaja - 17,
        size: 8,
        font: negrita,
        color: gris,
      });
      page.drawText(datos.fecha, {
        x: MARGEN + 16,
        y: topeCaja - 35,
        size: 14,
        font: negrita,
        color: tinta,
      });

      y = topeCaja - ALTO_CAJA - 16;
    }

    const desde = p * FILAS_POR_PAGINA;
    const hasta = Math.min(total, desde + FILAS_POR_PAGINA);

    for (let i = desde; i < hasta; i++) {
      const qr = datos.codigos[i];

      // Geometría de la tarjeta, toda calculada desde `base` (el borde
      // inferior de la tarjeta). Antes las coordenadas venían sueltas y el
      // marco del QR se salía de la tarjeta: los textos quedaban encima.
      const base = y - ALTO_TARJETA;
      const anchoTarjeta = ANCHO_PAGINA - MARGEN * 2;

      page.drawRectangle({
        x: MARGEN,
        y: base,
        width: anchoTarjeta,
        height: ALTO_TARJETA,
        borderColor: rgb(0.918, 0.867, 0.882),
        borderWidth: 1.5,
      });

      const png = await QRCode.toBuffer(qr.token, {
        width: 96,
        margin: 1,
        color: { dark: "#211a1d", light: "#ffffff" },
      });
      const imagen = await doc.embedPng(png);

      // QR centrado verticalmente dentro de la tarjeta.
      page.drawRectangle({
        x: MARGEN + 10,
        y: base + 8,
        width: 108,
        height: 108,
        color: rgb(0.984, 0.969, 0.973),
      });
      page.drawImage(imagen, {
        x: MARGEN + 16,
        y: base + 14,
        width: 96,
        height: 96,
      });

      const textoX = MARGEN + 138;

      // Etiqueta de zona, como etiqueta de color y no texto suelto.
      const anchoEtiqueta = negrita.widthOfTextAtSize(qr.etiqueta, 11) + 22;
      page.drawRectangle({
        x: textoX,
        y: base + 82,
        width: anchoEtiqueta,
        height: 19,
        color: vino,
      });
      page.drawText(qr.etiqueta, {
        x: textoX + 11,
        y: base + 87,
        size: 11,
        font: negrita,
        color: rgb(1, 1, 1),
      });

      page.drawText(qr.nombre, {
        x: textoX,
        y: base + 58,
        size: 15,
        font: negrita,
        color: tinta,
      });

      page.drawText(`${qr.servicio}  ·  ${qr.zona}`, {
        x: textoX,
        y: base + 39,
        size: 10.5,
        font: normal,
        color: gris,
      });

      // Código corto: respaldo para cuando la cámara de la puerta falla. Es el
      // mismo acceso que el QR, así que el empleado lo teclea y sigue validando.
      if (qr.codigoCorto) {
        page.drawText("Si la cámara falla, dicta este código:", {
          x: textoX,
          y: base + 24,
          size: 8,
          font: normal,
          color: rgb(0.6, 0.6, 0.6),
        });
        page.drawText(formatShortCode(qr.codigoCorto), {
          x: textoX,
          y: base + 9,
          size: 11,
          font: negrita,
          color: tinta,
        });
      } else {
        page.drawText("Presentar en la puerta de esta zona", {
          x: textoX,
          y: base + 20,
          size: 8,
          font: normal,
          color: rgb(0.6, 0.6, 0.6),
        });
      }

      y = base - 12;
    }
  }

  // `useObjectStreams: false` deja los objetos en claro: sin esto el PDF se
  // puede abrir igual, pero los tests no pueden verificar el contenido.
  return doc.save({ useObjectStreams: false });
}
