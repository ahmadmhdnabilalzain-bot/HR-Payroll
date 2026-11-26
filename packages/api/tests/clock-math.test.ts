import { describe, expect, it } from "vitest";
import {
  minutesFromDubaiMidnight,
  recordShape,
} from "../src/time/clock-math";

describe("clock math", () => {
  it("minutes from Dubai midnight", () => {
    expect(minutesFromDubaiMidnight("2026-03-01T20:30:00Z", "2026-03-02"))
      .toBe(30);
    expect(minutesFromDubaiMidnight("2026-03-02T22:00:00Z", "2026-03-02"))
      .toBe(1560);
  });
  it("odd records never become worked time", () => {
    const at = (t: string) => `2026-03-02T${t}:00Z`;
    expect(recordShape({ clock_in: at("05:00"), clock_out: null },
      "2026-03-02").kind).toBe("open");
    expect(recordShape({ clock_in: at("05:00"),
      clock_out: "2026-03-03T05:01:00Z" }, "2026-03-02").kind).toBe("open");
    expect(recordShape({ clock_in: at("05:00:10".slice(0, 5)),
      clock_out: at("05:00") }, "2026-03-02").kind).toBe("empty");
    expect(recordShape({ clock_in: at("05:00"), clock_out: at("13:00") },
      "2026-03-02")).toEqual({ kind: "closed", interval: { start: 540,
      end: 1020 } });
  });
});
