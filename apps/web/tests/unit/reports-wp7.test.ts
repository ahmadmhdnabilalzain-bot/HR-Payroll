import { describe, expect, it } from "vitest";
import { ALL_AREAS } from "../../src/nav/areas";
import { BLURB } from "../../src/reports/catalogue";
import { percent, share } from "../../src/reports/fmt";
import { buildReportsSource, plainAudit }
  from "../../src/reports/source";

const BANNED = /\b(compliant|approved|certified|guaranteed)\b/i;
const src = buildReportsSource();

describe("report data", () => {
  it("variance drivers add up to the change, for every month", () => {
    const keys = src.months.map((m) => m.month);
    for (let i = 1; i < keys.length; i++) {
      const v = src.variance(keys[i]!, keys[i - 1]!);
      const sum = v.drivers.reduce((n, d) => n + d.amount, 0n);
      expect(sum).toBe(v.grossChange);
      expect(v.grossNow - v.grossBefore).toBe(v.grossChange);
    }
  });

  it("covers January to October, with October waiting", () => {
    expect(src.months).toHaveLength(10);
    expect(src.months[0]!.label).toBe("Jan 2026");
    expect(src.months.at(-1)!.paid).toBe(false);
  });

  it("the audit chain checks, and a changed entry is found", () => {
    expect(src.verifyAudit(null)).toMatchObject({ ok: true,
      brokenAt: null, checked: src.audit.length });
    const bad = src.verifyAudit(11);
    expect(bad.ok).toBe(false);
    expect(bad.brokenAt).toBe(11);
  });

  it("audit text makes no claim the demo may not make", () => {
    for (const r of src.audit) {
      expect(BANNED.test(`${r.action} ${r.summary} ${r.subject}`))
        .toBe(false);
    }
    expect(plainAudit("X approved Y's annual leave")).toMatch(/booked/);
  });

  it("headcount rolls forward: start + joined - left = now", () => {
    for (const d of src.departments) {
      expect(d.start + d.joined - d.departed).toBe(d.now);
    }
    expect(src.joiners.length).toBeGreaterThan(0);
    expect(src.leavers.length).toBeGreaterThan(0);
  });

  it("overtime lines add up to the monthly figures", () => {
    for (const m of src.months) {
      const mine = src.overtime.filter((l) => l.month === m.month);
      expect(mine.reduce((n, l) => n + l.amount, 0n))
        .toBe(m.overtimeAmount);
      expect(mine.reduce((n, l) => n + l.minutes, 0))
        .toBe(m.overtimeMinutes);
    }
  });
});

describe("report catalogue and formats", () => {
  it("every live reports area has a one-line question", () => {
    const live = ALL_AREAS.filter((a) => a.section === "reports" &&
      a.status === "live");
    expect(live.length).toBeGreaterThanOrEqual(13);
    expect(live.filter((a) => (BLURB[a.id] ?? "") === "")
      .map((a) => a.id)).toEqual([]);
  });

  it("percent and share round to one decimal", () => {
    expect(percent(25n, 1000n)).toBe("+2.5%");
    expect(percent(-1n, 3n)).toBe("-33.3%");
    expect(share(1, 30)).toBe("3.3%");
    expect(share(0, 0)).toBe("none");
  });
});
