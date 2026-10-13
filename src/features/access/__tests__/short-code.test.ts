import { describe, expect, it } from "vitest";

import {
  SHORT_CODE_ALPHABET,
  formatShortCode,
  generateShortCode,
  looksLikeShortCode,
  normalizeShortCode,
} from "../short-code";

describe("código corto del QR", () => {
  it("genera 8 símbolos del alfabeto sin caracteres que se confunden", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateShortCode();
      expect(code).toHaveLength(8);
      for (const ch of code) expect(SHORT_CODE_ALPHABET).toContain(ch);
      // Estas cuatro letras y estos dos digitos no pueden aparecer: son las que
      // alguien dicta mal, y si salieran el codigo seria imposible de escribir.
      expect(code).not.toMatch(/[01ILOZ]/);
    }
  });

  it("todo código generado se puede normalizar sin cambiarlo", () => {
    // La trampa sutil: si el alfabeto contuviera una letra que normalize()
    // corrige (I, L, O, Z), ese código nunca podría teclearse.
    for (let i = 0; i < 300; i++) {
      const code = generateShortCode();
      expect(normalizeShortCode(code)).toBe(code);
      expect(normalizeShortCode(formatShortCode(code))).toBe(code);
    }
  });

  it("no repite códigos en 500 generaciones", () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 500; i++) vistos.add(generateShortCode());
    // Con 32^8 posibilidades, 500 tiradasPracticamente no pueden chocar.
    expect(vistos.size).toBe(500);
  });

  it("normaliza lo que el empleado teclea", () => {
    expect(normalizeShortCode("k7m2-xqp4")).toBe("K7M2XQP4");
    expect(normalizeShortCode("  K7M2 XQP4 ")).toBe("K7M2XQP4");
    expect(normalizeShortCode("K7M2XQP4")).toBe("K7M2XQP4");
  });

  it("corrige las confusiones al teclear", () => {
    // Un cero puede teclearse como O y viceversa: ambos son la misma Q.
    expect(normalizeShortCode("0ABC")).toBe("QABC");
    expect(normalizeShortCode("OABC")).toBe("QABC");
    // Una L, una I o un uno son la misma J.
    expect(normalizeShortCode("1ABC")).toBe("JABC");
    expect(normalizeShortCode("IABC")).toBe("JABC");
    expect(normalizeShortCode("LABC")).toBe("JABC");
    // Una Z es el dos.
    expect(normalizeShortCode("ZABC")).toBe("2ABC");
  });

  it("reconoce un código corto y descarta cualquier otra cosa", () => {
    expect(looksLikeShortCode("K7M2-XQP4")).toBe(true);
    expect(looksLikeShortCode("k7m2xqp4")).toBe(true);
    expect(looksLikeShortCode("K7M2XQP")).toBe(false); // 7 símbolos
    expect(looksLikeShortCode("K7M2XQP44")).toBe(false); // 9
    // El token del QR es base64url: nunca debe pasar por aquí.
    expect(looksLikeShortCode("aGVsbG8td29ybGQtdG9rZW4")).toBe(false);
    expect(looksLikeShortCode("")).toBe(false);
  });

  it("formatea el código como se imprime en el correo y el PDF", () => {
    expect(formatShortCode("K7M2XQP4")).toBe("K7M2-XQP4");
    expect(formatShortCode("k7m2-xqp4")).toBe("K7M2-XQP4");
    // Si no parece un código, se devuelve tal cual para no inventar.
    expect(formatShortCode("xx")).toBe("xx");
  });

  it("formatear nunca cambia el código", () => {
    // Formatear es solo presentar: si "corregir" un código al mostrarlo, el
    // cliente dictaría uno distinto al que realmente tiene.
    for (let i = 0; i < 200; i++) {
      const code = generateShortCode();
      const conGuion = formatShortCode(code);
      expect(conGuion.replace("-", "")).toBe(code);
    }
  });
});