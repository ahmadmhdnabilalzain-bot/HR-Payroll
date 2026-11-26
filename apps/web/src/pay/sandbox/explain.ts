import { fils } from "@payroll/engine";
import {
  money,
  text,
  type ExplainRule,
  type Explanation,
} from "../../components/explain/types";
import { sumExplain } from "../../components/explain/sum";
import type { SandboxResult, SandboxRow } from "../../demo/data/sandbox";

/**
 * The working behind the sandbox's figures, built from the same rows
 * the table shows so the figure and its working cannot differ. Plain
 * data in, plain data out.
 */
const SCOPE = "UAE mainland rules";

const RULE: ExplainRule = {
  text: "A sandbox works October out again by the same calculation as " +
    "the pay run, on the same rules, with only the draft's change. " +
    "The pay run itself is not changed.",
  status: "convention", statusLabel: null,
  citation: "Our own working, as we apply it" };

const PENSION = "Pension for UAE nationals: Not computed. Employer " +
  "pension is Not computed either, so employer cost is partial.";

/** One person: each earning line that moves, then deductions. */
export function personExplain(r: SandboxRow, draft: string): Explanation {
  const lineSteps = r.lines.map((l) => ({
    text: `${l.label}, change`,
    value: money(fils(l.after - l.before)), op: "add" as const }));
  const lineInputs = r.lines.flatMap((l) => [
    { label: `${l.label} as run`, value: money(l.before),
      from: "October pay run" },
    { label: `${l.label} in the sandbox`, value: money(l.after),
      from: "Sandbox, worked out by the payroll" }]);
  return { id: `sandbox:net:${r.employeeId}`,
    title: "Change to net pay", subject: r.name,
    summary: `October worked out again for ${r.name} with the draft: ` +
      "each pay line that moves, less the change in deductions.",
    result: { label: "Change to net pay", value: money(r.difference.net) },
    inputs: [
      { label: "Draft", value: text(draft), from: "Sandbox" },
      { label: "Net pay as run", value: money(r.before.net),
        from: "October pay run" },
      { label: "Net pay in the sandbox", value: money(r.after.net),
        from: "Sandbox, worked out by the payroll" }, ...lineInputs],
    rules: [RULE],
    steps: [...lineSteps,
      { text: "Deductions change", value: money(r.difference.deductions),
        op: "less" },
      { text: "Change to net pay", value: money(r.difference.net),
        op: "total" }],
    notComputed: r.pensionNotComputed ? [PENSION] : [], scope: SCOPE };
}

/** The employer cost: gross change plus the employer amounts. */
export function employerExplain(r: SandboxRow, draft: string)
  : Explanation {
  return { id: `sandbox:employer:${r.employeeId}`,
    title: "Change to employer cost", subject: r.name,
    summary: "Employer cost moves by the change in gross pay plus the " +
      "change in the employer amounts the payroll computed.",
    result: { label: "Change to employer cost",
      value: money(r.difference.employerCost) },
    inputs: [{ label: "Draft", value: text(draft), from: "Sandbox" }],
    rules: [RULE],
    steps: [
      { text: "Change to gross pay", value: money(r.difference.gross),
        op: "add" },
      { text: "Change to employer amounts computed",
        value: money(r.difference.employer), op: "add" },
      { text: "Change to employer cost",
        value: money(r.difference.employerCost), op: "total" }],
    notComputed: r.pensionNotComputed ? [PENSION] : [], scope: SCOPE };
}

/** The whole sandbox: the people's changes added up. */
export function totalExplain(res: SandboxResult, draft: string)
  : Explanation {
  return sumExplain({ id: "sandbox:net:total",
    title: "Change to net pay", subject: "October pay run, in the sandbox",
    summary: "Each person's change to net pay, added up. " +
      `${res.unchanged} people do not move.`,
    resultLabel: "Change to net pay",
    parts: res.rows.map((r) => ({ text: r.name,
      value: money(r.difference.net) })),
    inputs: [{ label: "Draft", value: text(draft), from: "Sandbox" }],
    rules: [RULE],
    notComputed: res.pensionNotComputed > 0 ? [PENSION] : [],
    scope: SCOPE });
}

/** The employer cost, added up over the people. */
export function totalEmployerExplain(res: SandboxResult, draft: string)
  : Explanation {
  return sumExplain({ id: "sandbox:employer:total",
    title: "Change to employer cost",
    subject: "October pay run, in the sandbox",
    summary: "Each person's change to employer cost, added up.",
    resultLabel: "Change to employer cost",
    parts: res.rows.map((r) => ({ text: r.name,
      value: money(r.difference.employerCost) })),
    inputs: [{ label: "Draft", value: text(draft), from: "Sandbox" }],
    rules: [RULE], notComputed: [PENSION], scope: SCOPE });
}
