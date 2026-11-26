import type { ContractCheck } from "../../demo/data/payroll-extras-types";
import type { PersonRow } from "../../demo/data/run-types";

/** One line of the pre-pay gate: pass or stop, with what it found. */
export interface GateCheck {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
  /** Where to put it right: [section, ...rest] for hrefOf. */
  to: string[];
}

export interface GateInput {
  /** Names of the people whose bank details hold the run back. */
  blocked: string[];
  people: readonly PersonRow[];
  filePeople: number;
  limitPct: number;
  limitText: string;
  correctionsWaiting: number;
  correctionsBooked: number;
  nextRun: string;
  contracts: ContractCheck;
  holds: number;
  list(names: string[]): string;
}

const people = (n: number): string => `${n} ${n === 1 ? "person" : "people"}`;
const abs = (v: bigint): bigint => v < 0n ? -v : v;

/** People whose net moved past the limit, or who are new this month. */
export function overLimit(ps: readonly PersonRow[], pct: number)
  : PersonRow[] {
  const limit = BigInt(pct);
  return ps.filter((p) => p.prevNet === null ||
    abs(p.change) * 100n > limit * p.prevNet);
}

/** R15: the checks that must pass before pay goes out. */
export function gateChecks(g: GateInput): GateCheck[] {
  const big = overLimit(g.people, g.limitPct);
  const unexplained = big.filter((p) => p.reasons.length === 0);
  const mism = g.contracts.mismatches;
  return [
    { id: "iban", label: "Bank details for everyone paid",
      pass: g.blocked.length === 0, to: ["pay-run", "fix"],
      detail: g.blocked.length === 0 ? `All ${g.filePeople} IBANs pass ` +
        "their check." : `${g.list(g.blocked)}: IBAN missing or ` +
        "mistyped." },
    { id: "variance", label: "Changes over the usual limit",
      pass: unexplained.length === 0, to: ["pay-run", "review"],
      detail: big.length === 0 ? "No one's net pay moved more than " +
        `${g.limitText}.` : unexplained.length === 0
        ? `${people(big.length)} over ${g.limitPct}% or new; each has ` +
          "a reason."
        : `${g.list(unexplained.map((p) => p.name))}: over ` +
          `${g.limitPct}% with no reason.` },
    { id: "corrections", label: "Open pay corrections",
      pass: g.correctionsWaiting === 0, to: ["pay-run", "corrections"],
      detail: g.correctionsWaiting === 0 ? "None waiting. " +
        `${g.correctionsBooked} agreed earlier are paid in ${g.nextRun}.`
        : `${g.correctionsWaiting} waiting for a decision.` },
    { id: "contracts", label: "Pay matches each contract",
      pass: mism.length === 0, to: ["people"],
      detail: mism.length === 0 ? `All ${g.contracts.checked} payslips ` +
        "match their contract and grade band." : mism.map((m) =>
        `${m.name}: ${m.text}`).join(" ") },
    { id: "holds", label: "Salary holds", pass: true,
      to: ["pay-run", "gate", "holds"],
      detail: g.holds === 0 ? "No salary is held." : `${people(g.holds)} ` +
        "held by choice, marked do not pay." },
  ];
}
