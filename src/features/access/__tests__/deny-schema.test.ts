import { describe, expect, it } from "vitest";

import { denyRequestSchema } from "../access.schemas";

describe("denyRequestSchema (P2-5: sin confirmación no hay invalidación)", () => {
  it("rechaza la denegación sin bandera de confirmación", () => {
    const r = denyRequestSchema.safeParse({ token: "K7M2-XQP4", reason: "No coincide" });

    expect(r.success).toBe(false);
  });

  it("acepta la denegación doblemente confirmada", () => {
    const r = denyRequestSchema.safeParse({
      token: "K7M2-XQP4",
      reason: "No coincide",
      confirmacion: true,
    });

    expect(r.success).toBe(true);
  });
});
