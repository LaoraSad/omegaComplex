import { describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";

import { generarPdfQr } from "../qr-pdf";

/** El PDF se valida por su estructura binaria: cabecera, trailer, paginas y tamano. */
function pdfComoTexto(pdf: Uint8Array): string {
  return Buffer.from(pdf).toString("latin1");
}

/**
 * Texto realmente dibujado en la pagina.
 *
 * Los flujos de contenido van comprimidos y los textos se escriben como
 * operandos hexadecimales (`<436F6469676F73> Tj`), asi que hay que inflar y
 * luego traducir esos hex a texto para poder buscar dentro. Las imagenes son
 * flujos que no son Flate valido y `inflateSync` las descarta solo.
 */
function textoDibujado(pdf: Uint8Array): string {
  const buf = Buffer.from(pdf);
  let salida = "";
  let i = 0;
  while (i < buf.length) {
    const inicio = buf.indexOf("stream", i, "latin1");
    if (inicio === -1) break;
    let desde = inicio + "stream".length;
    if (buf[desde] === 0x0d) desde++;
    if (buf[desde] === 0x0a) desde++;
    const hasta = buf.indexOf("endstream", desde, "latin1");
    if (hasta === -1) break;
    try {
      salida += inflateSync(buf.subarray(desde, hasta)).toString("latin1");
    } catch {
      // No es un flujo de texto (es una imagen): se ignora.
    }
    i = hasta + "endstream".length;
  }

  return salida.replace(/<([0-9A-Fa-f\s]+)>/g, (_, hex: string) =>
    Buffer.from(hex.replace(/\s+/g, ""), "hex").toString("latin1"),
  );
}

/** Cuenta las paginas reales del documento. */
function contarPaginas(pdf: Uint8Array): number {
  const texto = pdfComoTexto(pdf);
  const conCount = (texto.match(/\/Count\s+(\d+)/g) ?? []).map((m) => Number(m.replace(/\D/g, "")));
  return conCount.length ? Math.max(...conCount) : (texto.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

/** Cuenta las imagenes embebidas: un QR por persona, mas el logo. */
function contarImagenes(pdf: Uint8Array): number {
  return (pdfComoTexto(pdf).match(/\/Subtype\s*\/Image/g) ?? []).length;
}

/**
 * Cuántas imágenes extra aporta cada persona.
 *
 * No se cuentan las del PDF completo porque el logo es un PNG con alfa y
 * `pdf-lib` lo embebe como imagen más su máscara, así que ocupa dos objetos.
 * Midiendo la diferencia contra un PDF sin QR, cada persona aporta exactamente
 * una imagen.
 */
async function imagenesPorQr(n: number): Promise<number> {
  const vacio = await generarPdfQr({ nombre: "Ana", fecha: "f", codigos: [] });
  const lleno = await generarPdfQr({ nombre: "Ana", fecha: "f", codigos: codigos(n) });
  return contarImagenes(lleno) - contarImagenes(vacio);
}

const codigosValidos = ["K7M2XQP4", "B93TQWE2", "M5KDXAP7", "T9WH4NRY", "X2PQ7EKM", "W6RBYF3C", "H8JMD2NX", "P4KWT9QC", "D3VSG7YM", "Q7NKB5XP", "T2HMW6RF", "V9DXC4PN"];

const codigos = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    etiqueta: `Z${Math.floor(i / 2) + 1}-P${String((i % 2) + 1).padStart(2, "0")}`,
    servicio: "Cancha de futbol",
    zona: i % 2 === 0 ? "Zona A" : "Zona B",
    nombre: `Persona ${i + 1}`,
    token: `token-secreto-${i}-abcdef123456`,
    codigoCorto: codigosValidos[i % codigosValidos.length],
  }));

describe("generador de PDF de QR", () => {
  it("produce un PDF valido", async () => {
    const pdf = await generarPdfQr({
      nombre: "Ana Lopez",
      fecha: "12 de octubre de 2026",
      codigos: codigos(2),
    });

    expect(pdf.byteLength).toBeGreaterThan(1000);
    expect(pdfComoTexto(pdf).startsWith("%PDF-")).toBe(true);
  });

  it("cierra el documento correctamente", async () => {
    const pdf = await generarPdfQr({ nombre: "Ana", fecha: "12 oct", codigos: codigos(1) });
    expect(pdfComoTexto(pdf)).toContain("%%EOF");
  });

  it("dibuja un QR por persona", async () => {
    const pdf = await generarPdfQr({
      nombre: "Ana Lopez",
      fecha: "12 de octubre de 2026",
      codigos: codigos(4),
    });

    // Un PNG embebido por cada persona: es lo que se escanea en la puerta.
    expect(await imagenesPorQr(4)).toBe(4);
  });

  it("mantiene el QR en una sola pagina para una reserva pequena", async () => {
    const pdf = await generarPdfQr({ nombre: "Ana", fecha: "f", codigos: codigos(4) });
    expect(contarPaginas(pdf)).toBe(1);
  });

  it("salta de pagina cuando hay mas personas de las que caben", async () => {
    const uno = await generarPdfQr({ nombre: "Ana", fecha: "f", codigos: codigos(2) });
    const muchos = await generarPdfQr({ nombre: "Ana", fecha: "f", codigos: codigos(12) });

    expect(contarPaginas(uno)).toBe(1);
    expect(contarPaginas(muchos)).toBeGreaterThan(1);
    // Y no se pierde ninguna: los 12 QR tienen que estar en el documento.
    expect(await imagenesPorQr(12)).toBe(12);
    // El peso ya no sirve para comparar: el logo pesa ~70 KB y domina el archivo.
    // Lo que importa es que las 12 personas quepan con salto de página.
    expect(contarPaginas(uno)).toBe(1);
    expect(contarPaginas(muchos)).toBeGreaterThan(1);
  });

  it("imprime el código corto para escribirlo si la cámara falla", async () => {
    const pdf = await generarPdfQr({ nombre: "Ana", fecha: "12 oct", codigos: codigos(1) });
    const texto = textoDibujado(pdf);
    expect(texto).toContain("K7M2-XQP4");
    expect(texto).toContain("Si la cámara falla");
    expect(texto).toContain("dicta este código");
  });

  it("conserva el texto de persona y zona junto al código", async () => {
    const pdf = await generarPdfQr({ nombre: "Ana", fecha: "f", codigos: codigos(1) });
    const texto = textoDibujado(pdf);
    expect(texto).toContain("Persona 1");
    expect(texto).toContain("Z1-P01");
  });

  it("no rompe con una reserva sin QR", async () => {
    const pdf = await generarPdfQr({ nombre: "Ana", fecha: "12 oct", codigos: [] });
    expect(pdfComoTexto(pdf).startsWith("%PDF-")).toBe(true);
  });

  it("produce un PDF distinto si cambian los datos", async () => {
    const a = await generarPdfQr({ nombre: "Ana", fecha: "f", codigos: codigos(2) });
    const b = await generarPdfQr({ nombre: "Luis", fecha: "f", codigos: codigos(2) });

    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
  });
});