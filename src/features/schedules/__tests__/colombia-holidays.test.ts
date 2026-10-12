import { describe, expect, it } from "vitest";

import {
  diaDeMantenimiento,
  diaDeSemana,
  esDiaDeMantenimiento,
  esFestivo,
  festivosDe,
  nombreFestivo,
} from "../colombia-holidays";

// Reglas que fija el cliente:
//   - El complejo atiende de martes a domingo.
//   - El lunes es mantenimiento.
//   - Si el lunes es festivo, el mantenimiento se traslada al martes.

describe("festivos de Colombia", () => {
  it("no trata un día cualquiera como festivo", () => {
    expect(esFestivo("2026-10-13")).toBe(false);
    expect(esFestivo("2026-10-15")).toBe(false);
  });

  it("observa todos los festivos en lunes (Ley Emiliani)", () => {
    // 2026-11-01 es domingo, así que se observa el lunes de esa semana:
    // 2026-10-26.
    expect(esFestivo("2026-11-01")).toBe(false);
    expect(nombreFestivo("2026-10-26")).toBe("Todos los Santos");
    // 2026-08-15 es sábado y se observa el lunes 2026-08-10.
    expect(nombreFestivo("2026-08-10")).toBe("Asunción de la Virgen");
  });

  it("deja los festivos que ya caen en lunes donde están", () => {
    // 2026-10-12 es lunes y es festivo: no se mueve.
    expect(esFestivo("2026-10-12")).toBe(true);
    expect(nombreFestivo("2026-10-12")).toBe("Día de la Raza");
  });

  it("calcula los festivos móviles desde la Pascua", () => {
    // Pascua 2026 = 5 de abril: Jueves Santo 2 y Viernes Santo 3.
    expect(nombreFestivo("2026-04-02")).toBe("Jueves Santo");
    expect(nombreFestivo("2026-04-03")).toBe("Viernes Santo");
  });

  it("NO traslada la Semana Santa al lunes", () => {
    // El lunes de esa semana (2026-04-06) abre normal; el mantenimiento sigue
    // siendo ese lunes.
    expect(esFestivo("2026-04-06")).toBe(false);
    expect(diaDeMantenimiento("2026-04-06")).toBe(1);
    // Corpus Christi sí se observa un lunes: en 2026 cae el 1 de junio.
    expect(nombreFestivo("2026-06-01")).toBe("Corpus Christi");
    expect(nombreFestivo("2026-06-08")).toBe("Sagrado Corazón del Señor");
  });

  it("tiene lista de festivos para el año en curso", () => {
    // Si alguien limpia el calendario, esto falla y avisa.
    const anioActual = new Date().getUTCFullYear();
    const lista = new Set([...festivosDe(anioActual).keys()]);
    expect(lista.size).toBeGreaterThan(10);
  });
});

describe("día de mantenimiento", () => {
  it("es lunes en una semana normal", () => {
    // Semana del lunes 2026-10-19, que no es festivo.
    expect(esFestivo("2026-10-19")).toBe(false);
    expect(diaDeMantenimiento("2026-10-20")).toBe(1);
    expect(esDiaDeMantenimiento("2026-10-19")).toBe(true);
    expect(esDiaDeMantenimiento("2026-10-20")).toBe(false);
  });

  it("se traslada al martes cuando el lunes es festivo", () => {
    // Semana del lunes 2026-10-12, festivo por el Día de la Raza.
    expect(esFestivo("2026-10-12")).toBe(true);
    expect(diaDeMantenimiento("2026-10-13")).toBe(2);
    expect(esDiaDeMantenimiento("2026-10-13")).toBe(true);
    // Y ese lunes festivo NO es día de mantenimiento.
    expect(esDiaDeMantenimiento("2026-10-12")).toBe(false);
  });

  it("no marca como mantenimiento el resto de la semana", () => {
    // Domingo y miércoles de la semana del lunes festivo.
    expect(esDiaDeMantenimiento("2026-10-11")).toBe(false);
    expect(esDiaDeMantenimiento("2026-10-14")).toBe(false);
  });
});

describe("día de la semana", () => {
  it("usa 0=domingo .. 6=sábado", () => {
    expect(diaDeSemana("2026-10-11")).toBe(0);
    expect(diaDeSemana("2026-10-12")).toBe(1);
    expect(diaDeSemana("2026-10-13")).toBe(2);
    expect(diaDeSemana("2026-10-17")).toBe(6);
  });
});