import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";

/**
 * The drawer's "Rules used" reads as plain sentences and every step of
 * the working carries an amount, for every payslip figure.
 */
const P = buildDemoData().people;

function all() {
  const out: ReturnType<typeof P.explain>[] = [];
  for (const x of P.people()) {
    const s = P.payslip(x.id);
    if (s === null) continue;
    const ids = [...s.lines.map((l) => l.traceId), s.grossTraceId,
      s.deductionsTraceId, s.netTraceId,
      ...(s.pension === null ? [] : [s.pension.traceId])];
    for (const id of ids) out.push(P.explain(s.id, id, "Figure", "en"));
  }
  return out;
}

describe("explain drawer wording", () => {
  const list = all();

  it("rules are sentences, never a parameter and its value", () => {
    const rules = list.flatMap((e) => e.rules);
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.text).toMatch(/\.$/);
      expect(r.text).not.toMatch(/: |\b(true|false)\b|\b\d{4,}\b|half up/);
      expect(r.citation ?? "").not.toMatch(/engine convention|not law/);
    }
    const text = rules.map((r) => r.text);
    expect(text).toContain("Overtime is paid at 125% of the hourly rate.");
  });

  it("every step carries an amount", () => {
    for (const e of list) {
      for (const st of e.steps) {
        expect(st.value, `${e.id}: ${st.text}`).toBeDefined();
      }
    }
  });
});
