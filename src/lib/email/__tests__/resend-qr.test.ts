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
  { etiqueta: "Z1-P01", servicio: "Piscina adultos 1", zona: "Piscinas", nombre: "Ana López", token: "token-crudo-1" },
  { etiqueta: "Z2-P01", servicio: "Cancha de fútbol", zona: "Canchas", nombre: "Ana López", token: "token-crudo-2" },
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
    // Una imagen PNG embebida por código, cada una con su etiqueta y servicio.
    expect(args.html.match(/data:image\/png/g)?.length).toBe(2);
    expect(args.html).toContain("Z1-P01");
    expect(args.html).toContain("Piscina adultos 1");
    expect(args.html).toContain("1 de noviembre de 2026");
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
