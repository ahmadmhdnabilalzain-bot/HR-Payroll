import { describe, expect, it } from "vitest";
import { contractProblems } from "../../src/components/explain/types";
import { buildRunSource } from "../../src/demo/data/run-detail";
import { buildDemoSource } from "../../src/demo/data/adapter";

const BANNED = /\b(compliant|approved|certified|guaranteed)\b/i;
const CODES = /\b(mod 97|[A-Z]{3,}_[A-Z_]+|\d{4}-\d{2}-\d{2})\b/;

const d = buildRunSource().at({});
const all = Object.values(d.explain);
const money = (v: { kind: string; fils?: bigint } | undefined): bigint =>
  v?.kind === "money" ? v.fils ?? 0n : 0n;

describe("explain contract", () => {
  it("every-explanation-meets-the-contract", () => {
    expect(all.length).toBeGreaterThan(30);
    const bad = all.flatMap((e) => contractProblems(e)
      .map((p) => `${e.id}: ${p}`));
    expect(bad).toEqual([]);
  });

  it("featured-has-gratuity-overtime-loan", () => {
    expect(d.featured.map((x) => x.split(":")[0]))
      .toEqual(["gratuity", "overtime", "loan", "run"]);
    for (const id of d.featured) expect(d.explain[id]).toBeDefined();
  });

  it("gratuity-steps-reconcile-to-the-fils", () => {
    const id = d.featured.find((x) => x.startsWith("gratuity:"))!;
    const g = d.explain[id]!;
    const tier1 = money(g.steps[2]?.value);
    const tier2 = money(g.steps[3]?.value);
    expect(tier1 + tier2).toBe(money(g.result.value));
    expect(money(g.result.value)).toBe(17392808n);
    expect(g.steps[0]?.text).toContain("7 years and 220 days");
    expect(g.notComputed.join(" ")).toMatch(/Notice pay is not/);
    expect(g.notComputed.join(" ")).toMatch(/Deductions/);
  });

  it("gratuity-cites-article-51-in-plain-words", () => {
    const g = d.explain[d.featured[0]!]!;
    const cites = g.rules.map((r) => r.citation ?? "").join(" ");
    expect(cites).toContain("Decree-Law 33 of 2021");
    expect(cites).toContain("Article 51(2)(a)");
    expect(cites).toContain("Article 51(6)");
    expect(new Set(g.rules.map((r) => r.status)))
      .toEqual(new Set(["official", "secondary", "convention"]));
  });

  it("loan-cap-steps-add-up", () => {
    const l = d.explain[d.featured[2]!]!;
    const [, cap, asked, taken, moved] = l.steps.map((s) => money(s.value));
    expect(taken).toBe(cap);
    expect((taken ?? 0n) + (moved ?? 0n)).toBe(asked);
  });

  it("person-steps-sum-to-net", () => {
    for (const p of d.people) {
      const e = d.explain[p.explainId]!;
      const gross = e.steps.find((s) => s.text === "Gross pay");
      expect(money(gross?.value)).toBe(p.gross);
      expect(money(e.result.value)).toBe(p.net);
    }
  });

  it("nationals-say-pension-not-computed", () => {
    const n = d.people.filter((p) => p.national);
    expect(n.length).toBe(14);
    for (const p of n) {
      expect(d.explain[p.explainId]!.notComputed.join(" "))
        .toMatch(/pension/i);
    }
  });

  it("explanations-make-no-claims-and-show-no-codes", () => {
    const texts = all.flatMap((e) => [e.title, e.summary,
      ...e.steps.map((s) => s.text), ...e.rules.map((r) => r.text),
      ...e.notComputed, ...e.inputs.map((i) => i.label)]);
    expect(texts.filter((x) => BANNED.test(x))).toEqual([]);
    expect(texts.filter((x) => CODES.test(x))).toEqual([]);
  });
});

describe("iban fix in the run detail", () => {
  it("held-pay-folds-into-the-file", () => {
    const src = buildDemoSource();
    const held = src.at({}).heldIds()[0]!;
    const before = buildRunSource().at({});
    const ibans = { [held]: src.bankLetterIban(held) };
    const after = buildRunSource().at(ibans);
    const heldNet = before.people.find((p) => p.id === held)!.net;
    expect(after.file.people).toBe(before.file.people + 1);
    expect(after.file.total).toBe(before.file.total + heldNet);
    expect(after.file.heldOut).toBe(0);
    expect(after.totals.net).toBe(before.totals.net);
    expect(src.at(ibans).heldIds()).toEqual([]);
  });

  it("typo-fix-clears-the-file-finding", () => {
    const src = buildDemoSource();
    const before = buildRunSource().at({});
    const f = before.file.findings.find((x) => x.kind === "issue")!;
    const who = before.people.find((p) => p.name === f.person)!;
    const after = buildRunSource().at({ [who.id]:
      src.bankLetterIban(who.id) });
    expect(after.file.findings.filter((x) => x.kind === "issue"))
      .toEqual([]);
    expect(after.file.findings.some((x) => x.kind === "note")).toBe(true);
  });

  it("a-wrong-iban-is-refused-in-plain-words", () => {
    const src = buildDemoSource();
    const held = src.at({}).heldIds()[0]!;
    const r = src.tryIban({}, held, "AE070000000000000000001");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason.en).not.toMatch(/mod 97/);
  });

  it("file-records-sum-to-the-file-total", () => {
    const sum = d.file.records.reduce((n, r) => n + r.total, 0n);
    expect(sum).toBe(d.file.total);
    expect(d.file.records.length).toBe(d.file.people);
  });
});
