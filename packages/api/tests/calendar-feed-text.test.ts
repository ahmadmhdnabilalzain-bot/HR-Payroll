import { describe, expect, it } from "vitest";
import { feedEvents, toIcsFeed, type FeedInput } from "../src/calendar/feed";

const ME = "00000000-0000-4000-8000-0000000000e1";
const REPORT = "00000000-0000-4000-8000-0000000000e2";
const L = (id: string, employeeId: string, typeName: string,
  status: "approved" | "pending", start = "2026-03-02",
  end = "2026-03-04") => ({ id, employeeId, employeeName: "Rami K",
  typeName, start, end, status });

const input = (over: Partial<FeedInput>): FeedInput => ({ scope: "my",
  viewerEmployeeId: ME, leave: [], holidays: [], deadlines: [], ...over });
const ics = (i: FeedInput) => toIcsFeed("Payroll calendar", feedEvents(i),
  new Date("2026-03-01T08:00:00Z"));

describe("calendar feed text", () => {
  it("feed_my_scope", () => {
    const text = ics(input({ leave: [L("l1", ME, "Annual", "approved"),
      L("l2", ME, "Annual", "pending", "2026-04-01", "2026-04-01")],
    holidays: [{ id: "h1", date: "2026-03-30", name: "Eid", kind:
      "public" }] }));
    expect(text).toContain("DTSTART;VALUE=DATE:20260302");
    expect(text).toContain("DTEND;VALUE=DATE:20260305");
    expect(text).toContain("SUMMARY:Leave: Annual");
    expect(text).toContain("SUMMARY:Leave (pending): Annual");
    expect(text).toContain("SUMMARY:Public holiday: Eid");
  });
  it("feed_team_hides_type", () => {
    const text = ics(input({ scope: "team", leave: [
      L("l3", REPORT, "Sick", "approved"),
      L("l4", REPORT, "Sick", "pending", "2026-05-01", "2026-05-01")] }));
    expect(text).toContain("SUMMARY:Away: Rami K");
    expect(text).not.toContain("Sick");
    expect(text.match(/BEGIN:VEVENT/g)?.length).toBe(1);
  });
  it("feed_deadlines", () => {
    const text = ics(input({ scope: "company-deadlines", deadlines: [{
      id: "d1", kind: "wps-salary", dueDate: "2026-07-01",
      period: { year: 2026, month: 6 }, rule: { status: "verified" } }] }));
    expect(text).toContain("SUMMARY:WPS salary payment due (2026-06)");
    expect(text).toContain("DESCRIPTION:Rule status: verified. See the " +
      "app for the source.");
  });
  it("feed_format", () => {
    const text = ics(input({ leave: [L("l5", ME,
      `Long, odd; name ${"x".repeat(120)}`, "approved")] }));
    expect(text.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(text.endsWith("END:VCALENDAR\r\n")).toBe(true);
    const lines = text.split("\r\n");
    expect(lines.at(-1)).toBe("");
    for (const l of lines) {
      expect(Buffer.byteLength(l)).toBeLessThanOrEqual(75);
      expect(l.includes("\n")).toBe(false);
    }
    expect(text).toContain("Long\\, odd\\; name");
  });
});
