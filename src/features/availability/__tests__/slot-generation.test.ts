import { describe, expect, it } from "vitest";

import { buildSlotsForSchedule } from "../availability.repository";

describe("buildSlotsForSchedule", () => {
  it("genera franjas por hora dentro del horario semanal", () => {
    const date = new Date("2026-10-09T00:00:00-05:00");
    const slots = buildSlotsForSchedule(date, { openTime: "08:00", closeTime: "17:00" }, 4);

    expect(slots).toHaveLength(9);
    expect(slots[0].startsAt.toISOString()).toBe("2026-10-09T13:00:00.000Z");
    expect(slots[0].endsAt.toISOString()).toBe("2026-10-09T14:00:00.000Z");
    expect(slots[8].startsAt.toISOString()).toBe("2026-10-09T21:00:00.000Z");
    expect(slots[8].endsAt.toISOString()).toBe("2026-10-09T22:00:00.000Z");
  });

  it("no inventa una franja cuando el horario es inválido o menor a una hora", () => {
    const date = new Date("2026-10-09T12:00:00Z");

    expect(buildSlotsForSchedule(date, { openTime: "17:00", closeTime: "08:00" }, 4)).toEqual([]);
    expect(buildSlotsForSchedule(date, { openTime: "08:30", closeTime: "09:15" }, 4)).toEqual([]);
  });
});
