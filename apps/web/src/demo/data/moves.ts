import { formatAed, type Fils } from "@payroll/engine";
import {
  candidateBoard,
  hiringSummary,
  joinerChecklistViews,
  moveViews,
  offerLetterText,
  offerViews,
  requisitionViews,
  vacancyViews,
  employmentEndView,
  leaverChecklistView,
  type DemoCompany,
} from "@payroll/demo-data";
import type { LetterLine, MovesData } from "./moves-types";

/**
 * The hiring, joining and leaving view over the demo company.
 * Imported only by adapter.ts, so the package stays in the lazy chunk.
 * The package words some steps as "approval"; the demo says "sign-off"
 * (a person in the company decides; no authority is involved).
 */
export function plain(s: string): string {
  return s.replace(/not yet approved/g, "not yet signed off")
    .replace(/Approved, starts later/g, "Starts later")
    .replace(/Approve and send/g, "Sign off and send")
    .replace(/Approved by/g, "Signed off by")
    .replace(/needs the HR manager's approval/g, "needs sign-off")
    .replace(/approved/g, "signed off");
}

const clean = <T extends { note: string }>(x: T): T =>
  ({ ...x, note: plain(x.note) });

export function adaptMoves(c: DemoCompany): MovesData {
  const offers = offerViews(c).map(clean);
  const letterOf = (id: string): LetterLine[] => {
    const o = offers.find((x) => x.id === id);
    if (o === undefined) return [];
    const pay = new Map<string, Fils>([[formatAed(o.basic), o.basic],
      [formatAed(o.gross), o.gross],
      ...o.allowances.map((a): [string, Fils] =>
        [formatAed(a.monthly), a.monthly])]);
    // A letter goes to a candidate: provenance stays off it (the
    // page's sources line carries it).
    return offerLetterText(c, id).filter((line) =>
      !/as we read them\.?$/.test(line)).map((line): LetterLine => {
      const m = /^(.+): (AED [\d,]+\.\d\d)$/.exec(line);
      const v = m === null ? undefined : pay.get(m[2] ?? "");
      return m !== null && v !== undefined
        ? { kind: "pay", label: m[1] ?? "", fils: v }
        : { kind: "text", text: plain(line) };
    });
  };
  const cands = candidateBoard(c);
  const all = [...cands.columns.flatMap((x) => x.candidates), ...cands.closed]
    .map((x) => ({ ...x, note: plain(x.note), nextStep: plain(x.nextStep) }));
  return {
    asOf: c.asOf,
    requisitions: () => requisitionViews(c),
    vacancies: () => vacancyViews(c),
    candidates: () => all,
    stages: () => cands.columns.map((x) => ({ stage: x.stage,
      label: x.label })),
    offers: () => offers,
    letter: letterOf,
    joiners: () => joinerChecklistViews(c),
    leavers: () => c.employees.filter((e) => e.leavingDate !== null)
      .map((e) => leaverChecklistView(c, e.id)).filter((x) => x !== null),
    endings: () => c.employees.map((e) => employmentEndView(c, e.id))
      .filter((x) => x !== null),
    moves: () => moveViews(c).map((m) => ({ ...m,
      note: plain(m.note), statusText: plain(m.statusText),
      summary: plain(m.summary) })),
    summary: () => hiringSummary(c),
  };
}
