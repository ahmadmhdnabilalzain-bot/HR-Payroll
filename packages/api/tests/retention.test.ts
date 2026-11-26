import { describe, expect, it } from "vitest";
import {
  addMonths,
  retainUntil,
  retentionDue,
} from "../src/documents/retention";

describe("retention", () => {
  it("adds months and clamps to the month's last day", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-02-29", 12)).toBe("2025-02-28");
    expect(addMonths("2024-10-31", 24)).toBe("2026-10-31");
    expect(addMonths("2026-11-15", 14)).toBe("2028-01-15");
  });
  it("retains from the chosen anchor, or not at all", () => {
    const anchors = { employmentEnd: "2024-10-31", expiry: null,
      issue: "2024-01-01" };
    expect(retainUntil({ months: 24, from: "employment-end" }, anchors))
      .toBe("2026-10-31");
    expect(retainUntil({ months: null, from: "employment-end" }, anchors))
      .toBeNull();
    expect(retainUntil({ months: 24, from: "employment-end" },
      { ...anchors, employmentEnd: null })).toBeNull();
    expect(retainUntil({ months: 6, from: "issue" }, anchors))
      .toBe("2024-07-01");
    expect(retainUntil({ months: 6, from: "expiry" }, anchors)).toBeNull();
  });
  it("lists items due on or before today, by date then id", () => {
    const base = { kind: "employee-document" as const, employeeId: null,
      retentionClass: "passport" as const };
    const out = retentionDue([
      { ...base, id: "b", retainUntil: "2026-11-26" },
      { ...base, id: "c", retainUntil: "2026-11-27" },
      { ...base, id: "a", retainUntil: "2026-11-26" },
      { ...base, id: "d", retainUntil: "2025-01-01" },
      { ...base, id: "e", retainUntil: null }], "2026-11-26");
    expect(out.map((x) => x.id)).toEqual(["d", "a", "b"]);
  });
});
