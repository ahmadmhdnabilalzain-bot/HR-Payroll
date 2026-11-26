import { parseAed } from "@payroll/engine";
import { fieldAt, parseSif } from "@payroll/wps";
import { describe, expect, it } from "vitest";
import {
  applyIbanFix,
  buildDemoCompany,
  displayDate,
  employeesWithCase,
  fakeIban,
  headline,
  issuesOf,
  openIssues,
  serializeDemo,
  sifSummary,
  type DemoCompany,
} from "../src/index";

const c = buildDemoCompany();
const sifSum = (d: DemoCompany) => parseSif(d.sif.text).records
  .filter((r) => r.type === "EDR").reduce((n, r) =>
    n + parseAed(fieldAt(r, 8)) + parseAed(fieldAt(r, 9)), 0n);

describe("issue wording", () => {
  it("every English reason is a sentence without codes or raw dates",
    () => {
      for (const i of issuesOf(c)) {
        const t = i.plainReason.en;
        expect(t, i.code).toMatch(/^[A-Z].*\.$/);
        expect(t, i.code).not.toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(t, i.code).not.toMatch(/[A-Z]{2,}_[A-Z_]+/);
        expect(t, i.code).not.toMatch(/SIF line|mod 97|overall-cap|\(s\)/i);
        expect(t, i.code).not.toMatch(/Decree|Article|Art \d/);
        expect(i.title, i.code).toMatch(/^[A-Z][^A-Z]*/);
        expect(i.title.length, i.code).toBeLessThan(40);
      }
    });

  it("dates come readable and as ISO", () => {
    const visa = issuesOf(c).find((i) => i.title ===
      "Residence visa expires soon")!;
    expect(visa.date).toEqual({ iso: "2026-11-08", display: "8 November" });
    expect(visa.plainReason.en).toBe("Jose Reyes's residence visa expires " +
      "on 8 November, in 12 days.");
    expect(displayDate("2027-01-03")).toBe("3 January 2027");
    const ot = issuesOf(c).find((i) => i.code ===
      "OVERTIME_DAILY_CAP_EXCEEDED")!;
    expect(ot.plainReason.en).toBe("Jose Reyes worked 2 hours 30 " +
      "minutes of overtime on 20 October, above the 2-hour daily limit. " +
      "Every minute is still paid.");
  });

  it("uses the agreed titles", () => {
    const titles = issuesOf(c).map((i) => i.title);
    for (const t of ["Bank details missing", "Bank account number has " +
      "a typo", "Overtime above the daily limit", "Loan deduction capped",
    "Sick day in probation is unpaid", "Final settlement needs notice " +
      "pay", "Pension: confirm the fund", "Demo bank code"]) {
      expect(titles).toContain(t);
    }
  });
});

describe("counts reconcile", () => {
  it("issuesOpen excludes notes and confirmations", () => {
    const all = issuesOf(c);
    const h = headline(c);
    expect(h.issuesOpen).toBe(openIssues(c).length);
    expect(h.issuesOpen + h.needsConfirmation + h.notes).toBe(all.length);
    expect(h.issues).toBe(h.issuesOpen);
    const routing = all.find((i) => i.code === "ROUTING_UNKNOWN")!;
    expect(routing.kind).toBe("note");
  });

  it("SIF line numbers are the file's own lines", () => {
    const s = sifSummary(c);
    const rows = c.sif.text.split(/\r?\n/).filter((l) => l !== "");
    expect(s.lines.total).toBe(rows.length);
    expect(s.lines.edr + s.lines.evp + s.lines.scr).toBe(rows.length);
    expect(s.lines.edr).toBe(c.sif.employees);
    for (const i of issuesOf(c).filter((x) => x.sif !== null)) {
      const row = rows[i.sif!.fileLine - 1]!;
      expect(row.startsWith(i.sif!.record), i.code).toBe(true);
    }
    const typo = issuesOf(c).find((i) => i.code === "IBAN_CHECKSUM")!;
    expect(typo.sif!.record).toBe("EDR");
    expect(typo.sif!.edrNumber).toBeLessThanOrEqual(c.sif.employees);
  });
});

describe("applyIbanFix", () => {
  const held = employeesWithCase(c, "missing-iban")[0]!;
  const n = Number(held.id.slice(4));

  it("puts the held pay in the SIF and recomputes totals", () => {
    const before = serializeDemo(c);
    const r = applyIbanFix(c, held.id, fakeIban(n).value);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(serializeDemo(c)).toBe(before);
    const d = r.demo;
    expect(d.payRun.totals.heldNet).toBe(0n);
    expect(d.sif.total).toBe(d.payRun.totals.net);
    expect(sifSum(d)).toBe(d.sif.total);
    expect(d.sif.employees).toBe(c.sif.employees + 1);
    expect(r.findings).toEqual(d.sif.findings);
    expect(issuesOf(d).map((i) => i.code)).not.toContain(
      "SIF_HELD_NO_IBAN");
    expect(headline(d).issuesOpen).toBe(headline(c).issuesOpen - 1);
    expect(headline(d).sifTotal).toBe(headline(c).net);
    const again = applyIbanFix(c, held.id, fakeIban(n).value);
    expect(again.ok && serializeDemo(again.demo)).toBe(serializeDemo(d));
  });

  it("fixes the typo case and clears its issue", () => {
    const typo = employeesWithCase(c, "iban-typo")[0]!;
    const r = applyIbanFix(c, typo.id, fakeIban(Number(typo.id.slice(4)))
      .value);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(issuesOf(r.demo).map((i) => i.code))
        .not.toContain("IBAN_CHECKSUM");
    }
  });

  it("refuses an invalid IBAN with a plain reason", () => {
    const bad = applyIbanFix(c, held.id, "AE12");
    expect(bad).toMatchObject({ ok: false,
      reason: "An IBAN has 23 characters: AE followed by 21 digits." });
    const good = fakeIban(n).value;
    const typo = good.slice(0, -1) + String((Number(good.at(-1)) + 1)
      % 10);
    const r = applyIbanFix(c, held.id, typo);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/mistyped/);
    expect(applyIbanFix(c, "emp-999", good).ok).toBe(false);
  });
});
