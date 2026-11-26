import type {
  PaperLetter,
  PaperRequest,
  PaperStage,
  PaperVisa,
  PaperWarning,
} from "../../demo/data/papers-types";
import type { DemoData } from "../../demo/data/types";
import type { PaperStep } from "../../demo/papers-state";
import type { DemoState, Section } from "../../demo/state";
import { personFor } from "../../demo/time-off";

/**
 * The papers rows as the screens read them: the package's records
 * plus every decision and new item in the store. Nothing is typed
 * here; words are in words.ts.
 */
const stepOf = (s: DemoState, id: string): PaperStep | null =>
  s.steps[id] ?? null;

/** Whole days between two ISO dates (civil, no clock). */
export function daysBetweenIso(from: string, to: string): number {
  const t = (iso: string): number => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((t(to) - t(from)) / 86_400_000);
}

/** Roles that work the HR queue; the others see nothing here. */
export const canWork = (s: Pick<DemoState, "role">): boolean =>
  s.role === "hr" || s.role === "gm";

// Staff requests -------------------------------------------------------

export type RequestStatus = "open" | "in-progress" | "done" | "declined" |
  "withdrawn";

export interface RequestRow extends PaperRequest {
  status: RequestStatus;
  step: PaperStep | null;
  isNew: boolean;
  note: string;
  /** Days waiting; null once the request is closed. */
  waiting: number | null;
}

export function requestRows(d: DemoData, s: DemoState): RequestRow[] {
  const asOf = d.papers.asOf;
  const made = s.newRequests.map((r): RequestRow => base({
    id: r.id, kind: r.kind, title: r.title, employeeId: r.employeeId,
    raisedOn: r.raisedOn, base: "open", assignedToId: d.papers.queueOwnerId,
    linksTo: null }, s, asOf, true, r.note));
  const given = d.papers.requests().map((r) =>
    base(r, s, asOf, false, ""));
  return [...made, ...given];
}

function base(r: PaperRequest, s: DemoState, asOf: string, isNew: boolean,
  note: string): RequestRow {
  const step = stepOf(s, r.id);
  const status = (step?.status ?? r.base) as RequestStatus;
  const closed = status === "done" || status === "declined" ||
    status === "withdrawn";
  return { ...r, status, step, isNew, note, waiting: closed ? null
    : daysBetweenIso(r.raisedOn, asOf) };
}

export const requestIsOpen = (r: RequestRow): boolean =>
  r.status === "open" || r.status === "in-progress";

// Letters --------------------------------------------------------------

export type LetterStatus = "draft" | "pending" | "issued" | "withdrawn";

export interface LetterRow extends Omit<PaperLetter, "base"> {
  status: LetterStatus;
  step: PaperStep | null;
  isNew: boolean;
  /** Who signs: the General manager. */
  signerId: string;
}

export function letterRows(d: DemoData, s: DemoState): LetterRow[] {
  const gm = d.people.personas().gmId;
  const row = (l: PaperLetter, isNew: boolean, signer: string): LetterRow => {
    const step = stepOf(s, l.id);
    const { base: b, ...rest } = l;
    return { ...rest, status: (step?.status ?? b) as LetterStatus, step,
      isNew, signerId: signer };
  };
  const made = s.newLetters.map((l, i) => row({ id: l.id, kind: l.kind,
    employeeId: l.employeeId, requestedOn: l.requestedOn, base: "pending",
    purpose: l.purpose, addressee: l.addressee,
    reference: `ZB-LTR-2026-${String(200 + s.newLetters.length - i)
      .padStart(4, "0")}`, monthlySalary: l.kind === "salary-certificate"
      ? d.papers.contractSalary(l.employeeId) : null }, true,
    l.checkerId));
  return [...made, ...d.papers.letters().map((l) => row(l, false, gm))];
}

export const letterIsOpen = (l: LetterRow): boolean =>
  l.status === "draft" || l.status === "pending";

// Visa cases -----------------------------------------------------------

export type VisaStatus = "to-start" | "in-progress" | "completed";

export interface StageRow extends PaperStage {
  index: number;
  step: PaperStep | null;
}

export interface VisaRow extends Omit<PaperVisa, "base" | "stages"> {
  status: VisaStatus;
  stages: StageRow[];
  /** The first step not yet done, or null when all are. */
  next: StageRow | null;
  startStep: PaperStep | null;
  daysLeft: number | null;
}

export function visaRows(d: DemoData, s: DemoState): VisaRow[] {
  return d.papers.visas().map((v) => {
    const stages = v.stages.map((g, index): StageRow => {
      const step = stepOf(s, `${v.id}#${index}`);
      return { ...g, index, step, done: g.done || step !== null };
    });
    const next = stages.find((g) => !g.done) ?? null;
    const startStep = stepOf(s, v.id);
    const status: VisaStatus = next === null ? "completed"
      : v.base === "to-start" && startStep === null ? "to-start"
        : "in-progress";
    return { ...v, status, stages, next, startStep,
      daysLeft: v.expiresOn === null ? null
        : daysBetweenIso(d.papers.asOf, v.expiresOn) };
  });
}

// Warnings -------------------------------------------------------------

export type WarningStatus = "draft" | "issued" | "closed" | "discarded";

export interface WarningRow extends Omit<PaperWarning, "base"> {
  status: WarningStatus;
  step: PaperStep | null;
}

export function warningRows(d: DemoData, s: DemoState): WarningRow[] {
  return d.papers.warnings().map((w) => {
    const step = stepOf(s, w.id);
    const { base: b, ...rest } = w;
    return { ...rest, status: (step?.status ?? b) as WarningStatus, step };
  });
}

// Who acted ------------------------------------------------------------

/** A step made by the viewer's role, as the store records it. */
export function stepBy(d: DemoData, s: DemoState, status: string)
  : PaperStep {
  return { status, by: personFor(d, s.role), role: s.role,
    on: d.papers.asOf };
}

// Compliance overview ---------------------------------------------------

export interface ComplianceRow {
  id: string;
  area: string;
  finding: string;
  href: [Section, ...string[]];
  attention: boolean;
  word: string;
  tone: "warn" | "danger" | "ok" | "quiet";
}

const items = (n: number, one: string, many: string): string =>
  `${String(n)} ${n === 1 ? one : many}`;

/** What is waiting, from the same records the other screens use. */
export function complianceRows(d: DemoData, s: DemoState)
  : ComplianceRow[] {
  const bank = d.heldIds().length + d.badIbanIds().length;
  const docs = d.documents().filter((x) => x.daysLeft <= 30).length;
  const visas = visaRows(d, s).filter((v) => v.status !== "completed")
    .length;
  const reqs = requestRows(d, s).filter(requestIsOpen).length;
  const lets = letterRows(d, s).filter(letterIsOpen).length;
  const warns = warningRows(d, s).filter((w) => w.status === "draft")
    .length;
  const nat = d.papers.nationalities();
  const row = (id: string, area: string, finding: string,
    href: ComplianceRow["href"], n: number, tone: "warn" | "danger" = "warn")
    : ComplianceRow => ({ id, area, finding, href, attention: n > 0,
    word: n === 0 ? "Nothing waiting" : tone === "danger" ? "Stops pay"
      : "Check", tone: n === 0 ? "ok" : tone });
  return [
    row("bank", "Bank details", bank === 0 ? "Every payslip has a bank " +
      "account that passes its check."
      : `${items(bank, "person", "people")} without a usable bank ` +
        "account.", ["pay-run", "fix"], bank, "danger"),
    row("docs", "Documents expiring", `${items(docs, "document expires",
      "documents expire")} within 30 days.`,
    ["reports", "documents"], docs),
    row("visas", "Visas and government cases",
      `${items(visas, "case is", "cases are")} open.`,
      ["people", "papers", "visas"], visas),
    row("requests", "Staff requests", `${items(reqs, "request is",
      "requests are")} waiting for HR.`,
    ["people", "papers", "requests"], reqs),
    row("letters", "Letters", `${items(lets, "letter is", "letters are")} ` +
      "not yet issued.", ["people", "papers", "letters"], lets),
    row("warnings", "Warnings", `${items(warns, "warning is",
      "warnings are")} in draft.`, ["people", "papers", "warnings"], warns),
    { id: "pension", area: "Pension",
      finding: `Not computed for ${items(nat.uaeNationals, "UAE national",
        "UAE nationals")}; the fund is to be confirmed.`,
      href: ["people", "papers", "pension"], attention: true, word: "Check",
      tone: "warn" },
    { id: "emirati", area: "Emiratisation",
      finding: `${String(nat.uaeNationals)} UAE nationals of ` +
        `${String(nat.headcount)} people. Headcount only.`,
      href: ["people", "papers", "emiratisation"], attention: false,
      word: "For information", tone: "quiet" },
  ];
}
