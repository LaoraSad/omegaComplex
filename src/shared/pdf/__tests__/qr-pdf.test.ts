import { describe, expect, it } from "vitest";

import { generarPdfQr } from "../qr-pdf";

/** El PDF se valida por su estructura binaria: cabecera, trailer, paginas y tamano. */
function pdfComoTexto(pdf: Uint8Array): string {
  return Buffer.from(pdf).toString("latin1");
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

const codigos = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    etiqueta: `Z${Math.floor(i / 2) + 1}-P${String((i % 2) + 1).padStart(2, "0")}`,
    servicio: "Cancha de futbol",
    zona: i % 2 === 0 ? "Zona A" : "Zona B",
    nombre: `Persona ${i + 1}`,
    token: `token-secreto-${i}-abcdef123456`,
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