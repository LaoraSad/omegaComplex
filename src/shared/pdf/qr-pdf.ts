import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

import type { QrParaCorreo } from "@/lib/email/resend";

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
/** Alto reservado para cada persona en la tabla. */
const ALTO_FILA = 132;
/** Alto que ocupa el encabezado (titulo, fecha y nota) en la primera pagina. */
const ALTO_ENCABEZADO = 74;

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
};

export async function generarPdfQr(datos: DatosPdfQr): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const normal = await doc.embedFont(StandardFonts.Helvetica);

  const vino = rgb(0.48, 0.12, 0.24);
  const gris = rgb(0.35, 0.33, 0.35);

  const total = datos.codigos.length;
  const paginas = Math.max(1, Math.ceil(total / FILAS_POR_PAGINA));

  for (let p = 0; p < paginas; p++) {
    const page = doc.addPage([ANCHO_PAGINA, ALTO_PAGINA]);
    let y = ALTO_PAGINA - MARGEN;

    if (p === 0) {
      page.drawText("Tus codigos QR", {
        x: MARGEN,
        y,
        size: 20,
        font: negrita,
        color: vino,
      });
      y -= 26;

      page.drawText(`Reserva del ${datos.fecha} - ${datos.nombre}`, {
        x: MARGEN,
        y,
        size: 11,
        font: normal,
        color: gris,
      });
      y -= 14;

      page.drawText(
        "Cada codigo es de un solo uso y solo sirve el dia de la reserva. Presentalo en la puerta de su zona.",
        { x: MARGEN, y, size: 9, font: normal, color: gris },
      );
      y -= ALTO_ENCABEZADO;
    }

    const desde = p * FILAS_POR_PAGINA;
    const hasta = Math.min(total, desde + FILAS_POR_PAGINA);

    for (let i = desde; i < hasta; i++) {
      const qr = datos.codigos[i];
      // Se dibuja de abajo hacia arriba: la primera persona queda arriba.
      const baseFila = y - ALTO_FILA + 18;

      page.drawRectangle({
        x: MARGEN,
        y: baseFila - 12,
        width: ANCHO_PAGINA - MARGEN * 2,
        height: ALTO_FILA - 16,
        borderColor: rgb(0.92, 0.87, 0.88),
        borderWidth: 1,
      });

      const png = await QRCode.toBuffer(qr.token, {
        width: 96,
        margin: 1,
        color: { dark: "#211a1d", light: "#ffffff" },
      });
      const imagen = await doc.embedPng(png);
      page.drawImage(imagen, {
        x: MARGEN + 14,
        y: baseFila + 6,
        width: 96,
        height: 96,
      });

      const textoX = MARGEN + 14 + 96 + 18;
      let textoY = baseFila + 80;

      page.drawText(`${qr.etiqueta} - ${qr.nombre}`, {
        x: textoX,
        y: textoY,
        size: 13,
        font: negrita,
        color: vino,
      });
      textoY -= 18;

      page.drawText(`${qr.servicio} / ${qr.zona}`, {
        x: textoX,
        y: textoY,
        size: 10.5,
        font: normal,
        color: gris,
      });

      y = baseFila - 12;
    }
  }

  // `useObjectStreams: false` deja los objetos en claro: sin esto el PDF se
  // puede abrir igual, pero los tests no pueden verificar el contenido.
  return doc.save({ useObjectStreams: false });
}
