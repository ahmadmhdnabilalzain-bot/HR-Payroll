import { addDays } from "@payroll/engine";
import { AS_OF } from "./calendar";
import { dateOf, type DisplayDate } from "./display";
import { letters, type LetterKind } from "./papers";
import type { DemoCompany } from "./types";

/**
 * WPE verifiable letters (P34) and document intake (P54). FICTIONAL
 * sample data. A code is worked out from the letter's id and person,
 * so it never changes and nothing is random. The check shows who
 * issued a letter, when and for whom, and never a pay figure. It
 * checks only the letters issued inside this demo: it is not a check
 * by any authority and claims no legal validity.
 */

export const VERIFY_NOTE = "It looks up letters issued from " +
  "here only. It shows who issued the letter, when and for whom, and " +
  "never a pay figure. It is not a check by any authority and carries no " +
  "legal weight.";

export const INTAKE_NOTE = "A scanned document you drop here stays in this " +
  "browser tab only. Nothing is sent anywhere, the text of a scan is " +
  "not read, and a reload clears it.";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function fnv(text: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** "VL-7K2M-QX4R": eight characters, none easy to misread. */
export function letterCodeOf(letterId: string, employeeId: string): string {
  const key = `${letterId}|${employeeId}`;
  const chars: string[] = [];
  for (const seed of [2166136261, 3339675911]) {
    let h = fnv(key, seed);
    for (let i = 0; i < 4; i++) {
      chars.push(ALPHABET[h & 31]!);
      h >>>= 5;
    }
  }
  return `VL-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export type VerifiableKind = Extract<LetterKind, "salary-certificate"
  | "noc">;
export type VerifiableStatus = "valid" | "withdrawn";

export interface VerifiableLetter {
  id: string;
  code: string;
  kind: VerifiableKind;
  employeeId: string;
  name: string;
  issuedBy: string;
  issuedOn: DisplayDate;
  status: VerifiableStatus;
  /** Set when withdrawn. */
  withdrawnOn: DisplayDate | null;
  /** What anyone sees: no pay figure, ever. */
  statement: string;
  display: { kind: string; issued: string; status: string };
}

const KIND_WORD: Record<VerifiableKind, string> = {
  "salary-certificate": "salary certificate",
  noc: "no-objection letter" };
const STATUS_WORD: Record<VerifiableStatus, string> = { valid: "Valid",
  withdrawn: "Withdrawn" };

/** Builds one record; the app uses it for letters issued in the demo. */
export function verifiableLetter(c: DemoCompany, x: { id: string;
  kind: VerifiableKind; employeeId: string; issuedOn: string;
  status: VerifiableStatus; withdrawnOn?: string | null }): VerifiableLetter {
  const e = c.employees.find((y) => y.id === x.employeeId);
  const name = e?.fullName ?? x.employeeId;
  const issued = dateOf(x.issuedOn);
  const withdrawn = x.withdrawnOn == null ? null : dateOf(x.withdrawnOn);
  const base = `Issued by ${c.company.name} on ${issued.display} for ` +
    `${name}, ${KIND_WORD[x.kind]}.`;
  const statement = x.status === "valid" ? base : `${base} Withdrawn by ` +
    `${c.company.name}${withdrawn === null ? "" : ` on ${withdrawn.display}`}.`;
  return { id: x.id, code: letterCodeOf(x.id, x.employeeId), kind: x.kind,
    employeeId: x.employeeId, name, issuedBy: c.company.name,
    issuedOn: issued, status: x.status, withdrawnOn: withdrawn, statement,
    display: { kind: KIND_WORD[x.kind][0]!.toUpperCase() +
      KIND_WORD[x.kind].slice(1), issued: issued.display,
    status: STATUS_WORD[x.status] } };
}

/** Earlier letters, issued before the demo day: [id, kind, who, on, ...]. */
const EARLIER: [string, VerifiableKind, string, string,
  VerifiableStatus, string | null][] = [
  ["vl-e1", "salary-certificate", "emp-005", "2026-09-14", "valid", null],
  ["vl-e2", "noc", "emp-016", "2026-08-03", "valid", null],
  ["vl-e3", "salary-certificate", "emp-009", "2026-07-21", "withdrawn",
    "2026-07-28"],
];

/**
 * The letters that carry a code: the issued salary certificates and
 * no-objection letters in the letters data, and the earlier ones.
 */
export function verifiableLetters(c: DemoCompany): VerifiableLetter[] {
  const issued = letters(c).filter((l) => l.status === "issued" &&
    (l.kind === "salary-certificate" || l.kind === "noc"))
    .map((l) => verifiableLetter(c, { id: l.id,
      kind: l.kind as VerifiableKind, employeeId: l.employeeId,
      issuedOn: addDays(l.requestedOn, 1), status: "valid" }));
  const earlier = EARLIER.map(([id, kind, employeeId, on, status, w]) =>
    verifiableLetter(c, { id, kind, employeeId, issuedOn: on, status,
      withdrawnOn: w }));
  return [...issued, ...earlier];
}

/** Capitals and digits only, without the "VL" lead. */
const squash = (text: string): string =>
  text.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^VL/, "");

export type Lookup =
  | { found: true; letter: VerifiableLetter }
  | { found: false };

/** The check: worked out from the letters given, nothing else. */
export function lookupLetter(all: readonly VerifiableLetter[],
  input: string): Lookup {
  const want = squash(input);
  if (want.length === 0) return { found: false };
  const hit = all.find((l) => squash(l.code) === want);
  return hit === undefined ? { found: false } : { found: true, letter: hit };
}

/* ---------------------------------------------------------------- *
 * P54 Document intake
 * ---------------------------------------------------------------- */

export type IntakeSource = "email" | "upload" | "hr";

export interface IntakeSample {
  id: string;
  source: IntakeSource;
  fileName: string;
  /** An address, a name or a place, as it came in. */
  from: string;
  receivedBy: string;
  employeeId: string | null;
  docType: string | null;
  expires: DisplayDate | null;
  receivedOn: DisplayDate;
  display: { source: string; time: string; filedTo: string;
    expires: string };
}

export const INTAKE_SOURCE_WORD: Record<IntakeSource, string> = {
  email: "Email", upload: "Upload", hr: "Handed to HR" };

const HR_OFFICER = "emp-029";

const SAMPLES: [IntakeSource, string, string | null, string | null,
  number, string, string | null][] = [
  ["email", "Medical fitness report.pdf", "emp-023", "Medical report", 1,
    "09:12", "2027-03-31"],
  ["email", "scan-0412.pdf", null, null, 1, "16:40", null],
  ["upload", "Training certificate.png", "emp-017", "Certificate", 3,
    "11:05", null],
  ["hr", "Fitness certificate.jpg", "emp-025", "Medical report", 4,
    "14:30", "2027-02-28"],
  ["email", "Degree certificate.pdf", "emp-021", "Certificate", 6, "08:47",
    null],
  ["upload", "Health card.pdf", "emp-018", "Medical report", 8, "10:20",
    "2027-01-12"],
];

const emailOf = (name: string): string =>
  `${name.toLowerCase().replace(/[^a-z ]/g, "").trim().replace(/ +/g, ".")}` +
  "@zarqan-demo.test";

/** Documents that came in before the demo day, and where each went. */
export function intakeSamples(c: DemoCompany): IntakeSample[] {
  const nameOf = (id: string): string =>
    c.employees.find((e) => e.id === id)?.fullName ?? id;
  return SAMPLES.map(([source, fileName, who, docType, daysAgo, time,
    expires], i) => {
    const on = addDays(AS_OF, -daysAgo);
    const from = who === null ? "unknown.sender@zarqan-demo.test"
      : source === "email" ? emailOf(nameOf(who))
        : source === "upload" ? `${nameOf(who)}, in the staff portal`
          : "HR desk";
    const filedTo = who === null || docType === null ? "Not filed yet"
      : `${docType}, ${nameOf(who)}`;
    return { id: `in-${i + 1}`, source, fileName, from,
      receivedBy: HR_OFFICER, employeeId: who, docType,
      expires: expires === null ? null : dateOf(expires),
      receivedOn: dateOf(on), display: { source: INTAKE_SOURCE_WORD[source],
        time, filedTo, expires: expires === null ? "" :
          dateOf(expires).display } };
  });
}
