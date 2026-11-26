import { describe, expect, it } from "vitest";
import { checkSampleTime, type SampleWindow } from "../src/wfh/sample-window";

const w: SampleWindow = { clockIn: "2026-03-01T08:00:00.000Z",
  clockOut: "2026-03-01T10:00:00.000Z", boundMinutes: 960,
  consentAt: "2026-03-01T08:30:00.000Z",
  pauses: [{ start: "2026-03-01T09:00:00.000Z",
    end: "2026-03-01T09:10:00.000Z" }],
  now: "2026-03-01T10:05:00.000Z" };
const at = (hhmm: string) => `2026-03-01T${hhmm}:00.000Z`;

/** Boundaries the review's mutations M10 and M14 moved. */
describe("checkSampleTime", () => {
  it("minutes before the current consent are outside", () => {
    expect(checkSampleTime(at("08:29"), w)).toBe("outside");
    expect(checkSampleTime(at("08:30"), w)).toBe("ok");
  });
  it("clock-out is exclusive", () => {
    expect(checkSampleTime(at("09:59"), w)).toBe("ok");
    expect(checkSampleTime(at("10:00"), w)).toBe("outside");
  });
  it("pause start inclusive, end exclusive; open pauses never end", () => {
    expect(checkSampleTime(at("09:00"), w)).toBe("paused");
    expect(checkSampleTime(at("09:10"), w)).toBe("ok");
    expect(checkSampleTime(at("09:30"), { ...w,
      pauses: [{ start: at("09:20"), end: null }] })).toBe("paused");
  });
  it("tracked-hours bound, future skew and late limit", () => {
    expect(checkSampleTime(at("09:30"), { ...w, clockOut: null,
      boundMinutes: 90 })).toBe("outside");
    expect(checkSampleTime(at("10:08"), { ...w, clockOut: null }))
      .toBe("outside");
    expect(checkSampleTime(at("08:45"), { ...w,
      now: "2026-03-02T09:00:00.000Z" })).toBe("outside");
  });
});
