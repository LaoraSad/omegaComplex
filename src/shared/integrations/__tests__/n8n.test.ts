import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.stubGlobal("fetch", mocks.fetch);

import { enviarEvento, n8nConfigurado, verificarFirma } from "../n8n";

const SECRETO = "secreto-de-prueba";
const URL = "https://n8n.example.com/webhook/omega";

function responder(status = 200) {
  return { ok: status >= 200 && status < 300, status };
}

describe("cliente de n8n", () => {
  beforeEach(() => {
    mocks.fetch.mockReset();
    process.env.N8N_WEBHOOK_URL = URL;
    process.env.N8N_WEBHOOK_SECRET = SECRETO;
  });

  afterEach(() => {
    delete process.env.N8N_WEBHOOK_URL;
    delete process.env.N8N_WEBHOOK_SECRET;
  });

  it("no considera configurado n8n si falta URL o secreto", () => {
    expect(n8nConfigurado()).toBe(true);

    delete process.env.N8N_WEBHOOK_SECRET;
    expect(n8nConfigurado()).toBe(false);

    process.env.N8N_WEBHOOK_SECRET = SECRETO;
    delete process.env.N8N_WEBHOOK_URL;
    expect(n8nConfigurado()).toBe(false);
  });

  it("no hace ninguna llamada si n8n no esta configurado", async () => {
    delete process.env.N8N_WEBHOOK_URL;

    const r = await enviarEvento("usuario.registrado", { email: "a@b.com" });

    expect(r).toEqual({ entregado: false, motivo: "n8n no configurado" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("envia el evento con la cabecera del evento", async () => {
    mocks.fetch.mockResolvedValue(responder());

    await enviarEvento("usuario.registrado", { email: "a@b.com", canal: "google" });

    const [, opciones] = mocks.fetch.mock.calls[0];
    expect(opciones.method).toBe("POST");
    expect(opciones.headers["X-Omega-Event"]).toBe("usuario.registrado");
    expect(JSON.parse(opciones.body).datos).toEqual({ email: "a@b.com", canal: "google" });
  });

  it("firma el cuerpo con HMAC del evento, la marca de tiempo y los datos", async () => {
    mocks.fetch.mockResolvedValue(responder());
    await enviarEvento("reserva.confirmada", { email: "a@b.com" });

    const [, opciones] = mocks.fetch.mock.calls[0];
    const cuerpo = JSON.parse(opciones.body);
    const esperada = createHmac("sha256", SECRETO)
      .update(`reserva.confirmada.${cuerpo.timestamp}.${opciones.body}`)
      .digest("hex");

    expect(opciones.headers["X-Omega-Signature"]).toBe(esperada);
    expect(opciones.headers["X-Omega-Timestamp"]).toBe(String(cuerpo.timestamp));
  });

  it("devuelve entregado cuando n8n responde 2xx", async () => {
    mocks.fetch.mockResolvedValue(responder(200));
    expect(await enviarEvento("usuario.registrado", {})).toEqual({ entregado: true });
  });

  it("reporta fallo sin lanzar cuando n8n responde con error", async () => {
    mocks.fetch.mockResolvedValue(responder(500));

    const r = await enviarEvento("usuario.registrado", {});

    expect(r.entregado).toBe(false);
    expect(r.motivo).toContain("500");
  });

  it("reporta fallo sin lanzar cuando la red se cae", async () => {
    mocks.fetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const r = await enviarEvento("reserva.confirmada", {});

    // Lo importante: no propaga. Un n8n caido no puede tumbar un registro ni
    // una reserva ya pagada.
    expect(r.entregado).toBe(false);
    expect(r.motivo).toContain("ECONNREFUSED");
  });
});

describe("verificacion de firma", () => {
  beforeEach(() => {
    process.env.N8N_WEBHOOK_URL = URL;
    process.env.N8N_WEBHOOK_SECRET = SECRETO;
  });

  afterEach(() => {
    delete process.env.N8N_WEBHOOK_URL;
    delete process.env.N8N_WEBHOOK_SECRET;
  });

  it("acepta una firma bien calculada y actual", () => {
    const evento = "reserva.confirmada";
    const ts = Math.floor(Date.now() / 1000);
    const cuerpo = JSON.stringify({ evento });
    const firma = createHmac("sha256", SECRETO).update(`${evento}.${ts}.${cuerpo}`).digest("hex");

    expect(verificarFirma(evento, ts, cuerpo, firma)).toBe(true);
  });

  it("rechaza una firma alterada", () => {
    const evento = "reserva.confirmada";
    const ts = Math.floor(Date.now() / 1000);
    const cuerpo = JSON.stringify({ evento });

    expect(verificarFirma(evento, ts, cuerpo, "f".repeat(64))).toBe(false);
  });

  it("rechaza un evento con el cuerpo modificado", () => {
    const evento = "reserva.confirmada";
    const ts = Math.floor(Date.now() / 1000);
    const original = JSON.stringify({ evento, datos: { monto: 100 } });
    const alterado = JSON.stringify({ evento, datos: { monto: 1 } });
    const firma = createHmac("sha256", SECRETO).update(`${evento}.${ts}.${original}`).digest("hex");

    expect(verificarFirma(evento, ts, alterado, firma)).toBe(false);
  });

  it("rechaza algo mas viejo que la ventana permitida", () => {
    const evento = "usuario.registrado";
    const ts = Math.floor(Date.now() / 1000) - 3600; // una hora
    const cuerpo = JSON.stringify({ evento });
    const firma = createHmac("sha256", SECRETO).update(`${evento}.${ts}.${cuerpo}`).digest("hex");

    expect(verificarFirma(evento, ts, cuerpo, firma)).toBe(false);
  });

  it("rechaza si no hay secreto configurado", () => {
    delete process.env.N8N_WEBHOOK_SECRET;
    expect(verificarFirma("usuario.registrado", Math.floor(Date.now() / 1000), "{}", "x")).toBe(false);
  });
});