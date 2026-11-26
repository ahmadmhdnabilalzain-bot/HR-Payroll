import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { quietUntil } from "../src/channels/quiet";

const night = { enabled: true, start: "22:00", end: "07:00" };
const iso = (d: Date | null) => d?.toISOString() ?? null;
const dubaiHhmm = (d: Date) =>
  new Date(d.getTime() + 4 * 3600_000).toISOString().slice(11, 16);

describe("quietUntil", () => {
  it("quiet_crosses_midnight", () => {
    const q = (s: string) => iso(quietUntil(new Date(s), night));
    expect(q("2026-03-01T19:30:00Z")).toBe("2026-03-02T03:00:00.000Z");
    expect(q("2026-03-02T02:59:00Z")).toBe("2026-03-02T03:00:00.000Z");
    expect(q("2026-03-02T03:00:00Z")).toBeNull();
    expect(q("2026-03-01T17:59:00Z")).toBeNull();
  });
  it("quiet_same_day_window", () => {
    const lunch = { enabled: true, start: "13:00", end: "14:00" };
    expect(iso(quietUntil(new Date("2026-03-01T09:30:00Z"), lunch)))
      .toBe("2026-03-01T10:00:00.000Z");
    expect(quietUntil(new Date("2026-03-01T19:30:00Z"),
      { ...night, enabled: false })).toBeNull();
  });
  it("is null or after now, within a day, at the end time", () => {
    const hhmm = fc.tuple(fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 })).map(([h, m]) =>
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    fc.assert(fc.property(fc.date({ min: new Date("2000-01-01"),
      max: new Date("2100-01-01"), noInvalidDate: true }), hhmm, hhmm,
    (now, start, end) => {
      fc.pre(start !== end);
      const r = quietUntil(now, { enabled: true, start, end });
      if (r === null) return true;
      return r > now && r.getTime() - now.getTime() <= 86_400_000 &&
        dubaiHhmm(r) === end;
    }));
  });
});
