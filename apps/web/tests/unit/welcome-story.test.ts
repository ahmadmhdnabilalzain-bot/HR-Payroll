import { fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import { buildDemoSource } from "../../src/demo/data/adapter";
import { formatMoney } from "../../src/i18n/format";
import { createT } from "../../src/i18n/t";
import { lineLabel } from "../../src/people/words";
import { isWelcome } from "../../src/welcome/route";
import { letterFixes, storyOf } from "../../src/welcome/story";
import { filesUnder, readWeb } from "../helpers/files";

const src = buildDemoSource();
const d = src.at({});
const t = createT("en");
const story = storyOf(src, t, "en");

describe("the opening's story", () => {
  it("net-pay-is-the-headline", () => {
    expect(story.netFils).toBe(d.headline().netTotalFils);
    expect(formatMoney(story.netFils, "en")).toBe("AED 933,730.94");
    expect(story.runMonth).toBe(d.headline().runMonth);
  });

  it("payslip-and-working-are-the-explain-panel", () => {
    const id = d.people.personas().employeeId;
    const slip = d.people.payslip(id);
    expect(slip).not.toBeNull();
    if (slip === null) return;
    expect(story.payslip.name).toBe(d.employee(id).name.en);
    expect(story.payslip.netFils).toBe(slip.netFils);
    expect(story.payslip.lines).toEqual(slip.lines.map((l) => ({
      label: lineLabel(l, t), fils: l.amountFils })));
    const line = slip.lines[story.payslip.figure];
    expect(line?.kind).toBe("overtime");
    const ex = d.people.explain(slip.id, line?.traceId ?? "",
      story.payslip.lines[story.payslip.figure]?.label ?? "", "en");
    expect(story.payslip.steps).toEqual(ex.steps.map((s) => ({
      label: s.text, fils: s.value?.kind === "money" ? s.value.fils
        : null })));
  });

  it("flagged-rows-are-the-bank-detail-issues", () => {
    const flagged = d.issues().filter((i) => i.fixKind === "enter-iban")
      .map((i) => i.employeeId);
    expect(story.rows.filter((r) => r.flag !== null).map((r) => r.id)
      .sort()).toEqual([...flagged].sort());
    for (const r of story.rows) {
      expect(r.netFils).toBe(d.people.payslip(r.id)?.netFils);
    }
  });

  it("file-total-moves-through-the-real-check", () => {
    const h = d.headline();
    const after = src.at(letterFixes(src)).headline();
    expect(story.file).toEqual({ beforeFils: h.sifTotalFils,
      afterFils: after.sifTotalFils, heldFils: h.heldNetFils });
    expect(after.heldNetFils).toBe(fils(0n));
    expect(story.file.afterFils).toBe(story.netFils);
  });

  it("approvals-are-the-inbox", () => {
    expect(story.approvals.map((a) => [a.id, a.amountFils])).toEqual(
      d.approvalsInbox().map((a) => [a.id, a.amountFils]));
  });

  it("is-built-from-the-company-as-it-starts", () => {
    /* A presenter who fixed the IBANs still replays two flagged rows. */
    const fixed = storyOf({ ...src, at: () => src.at(letterFixes(src)) },
      t, "en");
    expect(fixed.file.beforeFils).toBe(fixed.file.afterFils);
    expect(story.file.beforeFils).not.toBe(story.file.afterFils);
  });

  it("no-figure-typed-in-the-opening", () => {
    /* Grouped thousands, "AED 1", or a bigint of five digits or more. */
    const money = /\d{1,3}(,\d{3})+|AED\s*\d|\b\d{5,}n\b/;
    const hits = filesUnder("src/welcome", [".ts", ".tsx"])
      .filter((f) => money.test(readWeb(f)));
    expect(hits).toEqual([]);
  });

  it("route-is-only-welcome", () => {
    expect(isWelcome("#/welcome")).toBe(true);
    expect(isWelcome("#welcome")).toBe(true);
    expect(isWelcome("#/welcomed")).toBe(false);
    expect(isWelcome("#/home")).toBe(false);
  });
});
