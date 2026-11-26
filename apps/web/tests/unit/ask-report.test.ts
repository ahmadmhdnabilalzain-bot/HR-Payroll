import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { ALL_AREAS } from "../../src/nav/areas";
import { isReachable, routeOf } from "../../src/nav/registry";
import { INITIAL } from "../../src/demo/state";
import {
  examples,
  interpret,
  type AskContext,
} from "../../src/reports/ask/interpret";

const data = buildDemoData();
const choices = data.checks.templateChoices();
const hr = { data, state: { ...INITIAL, role: "hr" as const } };
const ctx: AskContext = {
  reports: ALL_AREAS.filter((a) => a.section === "reports" &&
    a.status === "live" && a.id !== "reports.all" &&
    a.id !== "reports.ask" && isReachable(a, "hr")).map((a) => ({
    id: a.id, label: a.label.en, rest: routeOf(a, hr).rest ?? [] })),
  months: choices.months, departments: choices.departments,
  runMonth: data.headline().runMonth };
const ask = (q: string) => interpret(q, ctx);
const monthOf = (name: string): string => choices.months.find((m) =>
  m.value.endsWith(name))!.value;

describe("X34 ask for a report in words", () => {
  it("maps-variance-for-a-month-to-the-report-and-its-filter", () => {
    const a = ask("variance for September");
    expect(a.kind).toBe("match");
    if (a.kind !== "match") return;
    expect(a.target.id).toBe("reports.variance");
    expect(a.rest).toEqual(["variance", monthOf("-09")]);
    expect(a.filterText).not.toBe("");
  });

  it("reads-last-month-and-this-month-from-the-run-month", () => {
    const keys = choices.months.map((m) => m.value);
    const i = keys.indexOf(ctx.runMonth);
    const last = ask("variance last month");
    expect(last.kind === "match" && last.rest.at(-1)).toBe(keys[i + 1]);
    const now = ask("variance this month");
    expect(now.kind === "match" && now.rest.at(-1)).toBe(ctx.runMonth);
  });

  it("opens-headcount-and-overtime-without-a-filter", () => {
    const h = ask("headcount by department");
    expect(h.kind === "match" && h.target.id).toBe("reports.headcount");
    const o = ask("overtime this month");
    expect(o.kind === "match" && o.target.id).toBe("reports.overtime");
    expect(o.kind === "match" && o.note).toContain("no filter");
  });

  it("sets-a-cost-centre-from-its-name", () => {
    const dept = choices.departments[0]!;
    const a = ask(`budget for ${dept.label}`);
    expect(a.kind === "match" && a.target.id).toBe("reports.cost-budget");
    expect(a.kind === "match" && a.rest).toEqual(["cost-budget",
      dept.value]);
  });

  it("shows-the-list-when-nothing-matches", () => {
    expect(ask("tell me a joke").kind).toBe("none");
    expect(ask("   ").kind).toBe("none");
  });

  it("opens-only-reports-the-role-may-see", () => {
    const none = { ...ctx, reports: [] };
    expect(interpret("variance for september", none).kind).toBe("none");
  });

  it("lists-examples-that-each-match-a-report", () => {
    const list = examples(ctx);
    expect(list.length).toBeGreaterThanOrEqual(3);
    for (const q of list) expect(ask(q).kind).toBe("match");
  });

  it("is-deterministic", () => {
    expect(ask("variance for september")).toEqual(ask(
      "variance for september"));
  });
});
