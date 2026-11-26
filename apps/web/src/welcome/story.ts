import type { Fils } from "@payroll/engine";
import type { DemoSource } from "../demo/data/types";
import type { T } from "../i18n/t";
import type { Lang } from "../i18n/types";
import { lineLabel } from "../people/words";

/**
 * Everything the opening shows, read from the same selectors as the
 * product. Built from the company as it starts (`source.at({})`), so a
 * presenter who already fixed the bank details still replays a story
 * with two flagged rows. The fixed state comes from the real salary
 * file check (`source.at` with the bank letters' IBANs), not from
 * arithmetic here. Nothing in this folder types a figure.
 */
export interface StoryLine {
  label: string;
  fils: Fils | null;
}

export interface StoryRow {
  id: string;
  name: string;
  department: string;
  netFils: Fils;
  /** The flag the product raises for this row, or null. */
  flag: { title: string; ibanLast4: string } | null;
}

export interface StoryApproval {
  id: string;
  title: string;
  who: string;
  amountFils: Fils | null;
  signer: string;
}

export interface Story {
  runMonth: string;
  netFils: Fils;
  payslip: {
    name: string;
    role: string;
    lines: StoryLine[];
    netFils: Fils;
    /** The line that lifts out (index into `lines`) and its working. */
    figure: number;
    steps: StoryLine[];
  };
  rows: StoryRow[];
  file: { beforeFils: Fils; afterFils: Fils; heldFils: Fils };
  approvals: StoryApproval[];
}

const OTHER_ROWS = 4;

function payslipPart(source: DemoSource, t: T, lang: Lang) {
  const d = source.at({});
  const id = d.people.personas().employeeId;
  const slip = d.people.payslip(id);
  if (slip === null) throw new Error("STORY_NO_PAYSLIP");
  const e = d.employee(id);
  const lines = slip.lines.map((l) => ({ label: lineLabel(l, t),
    fils: l.amountFils }));
  /* The figure is the one with a working worth showing: overtime. */
  const at = slip.lines.findIndex((l) => l.kind === "overtime");
  const figure = at < 0 ? slip.lines.length - 1 : at;
  const line = slip.lines[figure];
  if (line === undefined) throw new Error("STORY_NO_LINE");
  const ex = d.people.explain(slip.id, line.traceId, lines[figure]?.label
    ?? "", lang);
  const steps = ex.steps.map((s) => ({ label: s.text,
    fils: s.value?.kind === "money" ? s.value.fils : null }));
  return { name: e.name[lang], role: e.role[lang], lines,
    netFils: slip.netFils, figure, steps };
}

/** The ibans the bank letters carry, for every row the file holds. */
export function letterFixes(source: DemoSource): Record<string, string> {
  const d = source.at({});
  const out: Record<string, string> = {};
  for (const id of [...d.heldIds(), ...d.badIbanIds()]) {
    out[id] = source.bankLetterIban(id);
  }
  return out;
}

export function storyOf(source: DemoSource, t: T, lang: Lang): Story {
  const d = source.at({});
  const h = d.headline();
  const fixes = letterFixes(source);
  const after = source.at(fixes).headline();
  const flagged = d.issues().filter((i) => i.fixKind === "enter-iban" &&
    i.employeeId !== null);
  const flagOf = new Map(flagged.map((i) => [i.employeeId ?? "",
    i.title[lang]]));
  const net = (id: string): Fils | null =>
    d.people.payslip(id)?.netFils ?? null;
  const ids = [...flagOf.keys()];
  const others = d.employees().map((e) => e.id)
    .filter((id) => !flagOf.has(id) && net(id) !== null)
    .slice(0, OTHER_ROWS);
  /* Flagged rows sit among the others, as they would in the list. */
  const order = [others[0], ids[0], others[1], others[2], ids[1],
    others[3]].filter((x): x is string => x !== undefined);
  const rows = order.map((id): StoryRow => {
    const e = d.employee(id);
    const title = flagOf.get(id);
    return { id, name: e.name[lang], department: e.department[lang],
      netFils: net(id) ?? (0n as Fils),
      flag: title === undefined ? null : { title,
        ibanLast4: (fixes[id] ?? "").slice(-4) } };
  });
  const approvals = d.approvalsInbox().map((a): StoryApproval => ({
    id: a.id, title: a.title[lang],
    who: d.employee(a.employeeId ?? a.makerId).name[lang],
    amountFils: a.amountFils, signer: d.employee(a.checkerId).name[lang] }));
  return { runMonth: h.runMonth, netFils: h.netTotalFils,
    payslip: payslipPart(source, t, lang), rows,
    file: { beforeFils: h.sifTotalFils, afterFils: after.sifTotalFils,
      heldFils: h.heldNetFils },
    approvals };
}
