import type {
  IntakeSample,
  VerifiableLetter,
} from "../../demo/data/verify-types";
import type { DemoData } from "../../demo/data/types";
import type { DemoState } from "../../demo/state";
import type { Who } from "../../demo/verify-state";
import { dayText } from "../words";
import { letterRows } from "../papers/model";
import type { Lang } from "../../i18n/types";

/**
 * The letter codes and intake rows as the screens read them: the
 * package's samples plus everything done in the demo (letters issued
 * under Letters, codes withdrawn, documents taken in). Nothing is typed
 * here; words are in words.ts.
 */
export interface CodeRow extends VerifiableLetter {
  /** Who withdrew the code in the demo, if anyone did. */
  step: Who | null;
  /** True for a letter issued during the demo. */
  isNew: boolean;
}

export function codeRows(d: DemoData, s: DemoState): CodeRow[] {
  const base = d.verify.letters();
  const known = new Set(base.map((l) => l.id));
  const made = letterRows(d, s).filter((l) => l.status === "issued" &&
    (l.kind === "salary-certificate" || l.kind === "noc") &&
    !known.has(l.id)).map((l) => d.verify.make({ id: l.id,
    kind: l.kind as "salary-certificate" | "noc", employeeId: l.employeeId,
    issuedOn: l.step?.on ?? d.verify.asOf, status: "valid" }));
  const ids = new Set(made.map((l) => l.id));
  return [...made, ...base].map((l) => {
    const step = s.codesWithdrawn[l.id] ?? null;
    const row = step === null ? l : d.verify.make({ id: l.id, kind: l.kind,
      employeeId: l.employeeId, issuedOn: l.issuedOn.iso,
      status: "withdrawn", withdrawnOn: step.on });
    return { ...row, step, isNew: ids.has(l.id) };
  }).sort((a, b) => b.issuedOn.iso.localeCompare(a.issuedOn.iso));
}

export interface IntakeRow {
  id: string;
  source: string;
  fileName: string;
  from: string;
  receivedBy: string;
  employeeId: string | null;
  docType: string | null;
  expiresIso: string | null;
  receivedIso: string;
  /** Clock time for a sample; empty for what was added in the demo. */
  time: string;
  filedTo: string;
  isNew: boolean;
}

export function intakeRows(d: DemoData, s: DemoState, lang: Lang)
  : IntakeRow[] {
  const name = (id: string): string => d.people.person(id)?.name[lang] ?? id;
  const made = s.intakes.map((x): IntakeRow => ({ id: x.id,
    source: "Upload", fileName: x.fileName,
    from: `Dropped in by ${name(x.by)}`, receivedBy: x.by,
    employeeId: x.employeeId, docType: x.docType, expiresIso: x.expires,
    receivedIso: x.on, time: "", filedTo: `${x.docType}, ${
      name(x.employeeId)}`, isNew: true }));
  const given = d.verify.samples().map((x: IntakeSample): IntakeRow => ({
    id: x.id, source: x.display.source, fileName: x.fileName, from: x.from,
    receivedBy: x.receivedBy, employeeId: x.employeeId, docType: x.docType,
    expiresIso: x.expires?.iso ?? null, receivedIso: x.receivedOn.iso,
    time: x.display.time, filedTo: x.display.filedTo, isNew: false }));
  return [...made, ...given];
}

export interface ExpiryRow {
  id: string;
  employeeId: string;
  paper: string;
  expiresIso: string;
  daysLeft: number;
  /** "On file" for the sample's papers, "Taken in" for scans. */
  via: string;
}

const civil = (iso: string): number => {
  const [y, m, dd] = iso.split("-").map(Number);
  return Date.UTC(y ?? 0, (m ?? 1) - 1, dd ?? 1);
};
export const daysFrom = (from: string, to: string): number =>
  Math.round((civil(to) - civil(from)) / 86_400_000);

/** Papers with a date, from the sample, the intake and the demo. */
export function expiryRows(d: DemoData, s: DemoState, lang: Lang)
  : ExpiryRow[] {
  const given = d.documents().map((x): ExpiryRow => ({ id: x.id,
    employeeId: x.employeeId, paper: x.kind[lang], expiresIso: x.expiresOn,
    daysLeft: x.daysLeft, via: "On file" }));
  const taken = intakeRows(d, s, lang).filter((x) => x.expiresIso !== null &&
    x.employeeId !== null && x.docType !== null).map((x): ExpiryRow => ({
    id: x.id, employeeId: x.employeeId ?? "", paper: x.docType ?? "",
    expiresIso: x.expiresIso ?? "", daysLeft: daysFrom(d.verify.asOf,
      x.expiresIso ?? ""), via: "Taken in" }));
  return [...given, ...taken].sort((a, b) => a.daysLeft - b.daysLeft);
}

export const whenOf = (iso: string, lang: Lang): string =>
  dayText(iso, lang);
