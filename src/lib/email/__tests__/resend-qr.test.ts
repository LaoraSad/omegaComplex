import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));

const sendMock = mocks.send;

process.env.RESEND_API_KEY = "re_test";
process.env.RESEND_FROM_EMAIL = "noreply@omegacomplex.coderhivex.com";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

import { sendQrEmail } from "@/lib/email/resend";

const codigos = [
  { etiqueta: "Z1-P01", servicio: "Piscina adultos 1", zona: "Piscinas", nombre: "Ana López", token: "token-crudo-1", codigoCorto: "K7M2XQP4" },
  { etiqueta: "Z2-P01", servicio: "Cancha de fútbol", zona: "Canchas", nombre: "Ana López", token: "token-crudo-2", codigoCorto: "B93TQWE2" },
];

describe("sendQrEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ error: null });
  });

  it("envía un correo con un QR escaneable por código", async () => {
    await sendQrEmail("ana@example.com", {
      nombre: "Ana López",
      fecha: "1 de noviembre de 2026",
      codigos,
    });

    expect(sendMock).toHaveBeenCalledOnce();
    const args = sendMock.mock.calls[0][0];
    expect(args.to).toBe("ana@example.com");
    expect(args.subject).toContain("QR");

    // Las imágenes van ADJUNTAS por CID, nunca como `data:` URL: Gmail bloquea
    // ese esquema y el cliente termina viendo el texto `alt` en vez del QR.
    expect(args.html).not.toContain("data:image");
    expect(args.html).toContain('src="cid:qr-1"');
    expect(args.html).toContain('src="cid:qr-2"');

    const adjuntos = args.attachments ?? [];
    const qr = adjuntos.filter((a: { content_id: string }) => a.content_id.startsWith("qr-") && !a.content_id.includes("pdf"));
    expect(qr).toHaveLength(2);
    expect(qr[0].content_id).toBe("qr-1");
    expect(qr[0].filename).toBe("qr-1.png");
    // El tipo MIME es obligatorio o el cliente no renderiza la imagen.
    expect(qr[0].content_type).toBe("image/png");
    // El logo tambien viene adjunto, no referenciado por URL.
    expect(adjuntos.some((a: { content_id: string }) => a.content_id === "logo")).toBe(true);
    // El PDF vuelve adjunto: es la versión imprimible que usa el empleado.
    expect(adjuntos.some((a: { filename: string }) => a.filename === "codigos-qr.pdf")).toBe(true);

    expect(args.html).toContain("Z1-P01");
    expect(args.html).toContain("Piscina adultos 1");
    expect(args.html).toContain("1 de noviembre de 2026");
  });

  it("incluye el código corto transcribible de respaldo", async () => {
    await sendQrEmail("ana@example.com", {
      nombre: "Ana López",
      fecha: "1 de noviembre de 2026",
      codigos,
    });
    const args = sendMock.mock.calls[0][0];

    // Con guion, porque es como lo ve el cliente y como lo dicta.
    expect(args.html).toContain("K7M2-XQP4");
    expect(args.html).toContain("B93T-QWE2");
    // Y se explica para qué sirve: si la cámara de la puerta falla.
    expect(args.html).toContain("cámara");
  });

  it("no rompe cuando el QR es antiguo y no tiene código corto", async () => {
    await sendQrEmail("ana@example.com", {
      nombre: "Ana",
      fecha: "hoy",
      codigos: [{ etiqueta: "Z1-P01", servicio: "Piscina", zona: "Piscinas", nombre: "Ana", token: "t" }],
    });
    const args = sendMock.mock.calls[0][0];
    expect(args.html).toContain("Z1-P01");
    expect(args.html).not.toContain("dicta este código");
  });

  it("escapa HTML en nombres y propaga el error de Resend", async () => {
    await sendQrEmail("ana@example.com", {
      nombre: "<b>Ana</b>",
      fecha: "hoy",
      codigos: [{ ...codigos[0], nombre: "<b>Ana</b>" }],
    });
    const args = sendMock.mock.calls[0][0];
    expect(args.html).not.toContain("<b>Ana</b>");
    expect(args.html).toContain("&lt;b&gt;Ana&lt;/b&gt;");

    sendMock.mockResolvedValue({ error: { message: "rechazado" } });
    await expect(
      sendQrEmail("ana@example.com", { nombre: "Ana", fecha: "hoy", codigos }),
    ).rejects.toThrow("rechazado");
  });
});
