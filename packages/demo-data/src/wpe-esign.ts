import { addDays } from "@payroll/engine";
import { AS_OF } from "./calendar";
import { dateOf, type DisplayDate } from "./display";
import { salaryRevisions, loans, finalSettlements } from "./pay";
import { letters, warnings } from "./papers";
import { DEMO_EMAIL_DOMAIN } from "./roster";
import type { DemoCompany, DemoEmployee } from "./types";
import { probationEvaluationViews } from "./wp2";
import { jobTitleText, movesDataOf, offerViews, requisitionViews,
  type HiringOffer } from "./wp3";
import { askSeeds } from "./wpe-exit-files";
import { exitFlows } from "./wpe-exit";
import { policies } from "./wpe-safety";

/**
 * D5 electronic signing across the demo. FICTIONAL sample data. Each
 * document that needs a signature is worked out from the letters,
 * offers, warnings, revisions, loans, leave encashment asks, exits,
 * probation, policies and the joining pack of each new person; its
 * signers sign in a fixed order. A signing profile is made for every
 * person when they join (and for a candidate whose offer is accepted).
 * Nothing is random: a reference code comes from the document id.
 * This is a demo of the signing workflow and claims no legal validity.
 */

export const ESIGN_NOTE = "Signed here, no legal validity is claimed " +
  "for these signatures.";

export const ESIGN_CONSENT = "I confirm I have read this document and " +
  "agree to sign it electronically.";

/** The canonical form's version: a later change gets a new one. */
export const ESIGN_VERSION = "mubinflow-esig-v1";

/** The day the system started: earlier staff registered on that day. */
export const ESIGN_START = "2026-01-04";

export type EsignKind = "offer-letter" | "employment-contract" |
  "confidentiality" | "code-of-conduct" | "data-privacy" | "policy-ack" |
  "bank-details" | "salary-certificate" | "noc" | "experience-letter" |
  "warning" | "salary-revision" | "loan-agreement" | "leave-encashment" |
  "resignation-acceptance" | "settlement-receipt" |
  "probation-confirmation";

export const ESIGN_KINDS: readonly EsignKind[] = ["offer-letter",
  "employment-contract", "confidentiality", "code-of-conduct",
  "data-privacy", "policy-ack", "bank-details", "salary-certificate", "noc",
  "experience-letter", "warning", "salary-revision", "loan-agreement",
  "leave-encashment", "resignation-acceptance", "settlement-receipt",
  "probation-confirmation"];

export const ESIGN_KIND_TITLE: Record<EsignKind, string> = {
  "offer-letter": "Offer letter",
  "employment-contract": "Employment contract",
  confidentiality: "Confidentiality agreement",
  "code-of-conduct": "Code of conduct",
  "data-privacy": "Data privacy notice",
  "policy-ack": "Policy acknowledgement",
  "bank-details": "Bank details form",
  "salary-certificate": "Salary certificate",
  noc: "No-objection letter",
  "experience-letter": "Experience letter",
  warning: "Warning letter",
  "salary-revision": "Salary revision letter",
  "loan-agreement": "Loan or advance agreement",
  "leave-encashment": "Leave encashment form",
  "resignation-acceptance": "Resignation acceptance",
  "settlement-receipt": "Final settlement receipt",
  "probation-confirmation": "Probation confirmation" };

/** The seven papers of a joining pack, in signing order on the day. */
export const PACK_KINDS: readonly EsignKind[] = ["offer-letter",
  "employment-contract", "confidentiality", "code-of-conduct",
  "data-privacy", "policy-ack", "bank-details"];

export type SignerParty = "company" | "employee" | "candidate";

export interface EsignSigner {
  order: number;
  /** An employee id, or a signing profile key for a new person. */
  personId: string;
  name: string;
  role: string;
  /** "For the company", "Employee", "Candidate". */
  signsAs: string;
  party: SignerParty;
}

export type EsignVerdict = "signed" | "declined";

/** A signature (or a refusal) on one signer's line. */
export interface EsignMark {
  order: number;
  verdict: EsignVerdict;
  /** Whoever made it (person id or profile key). */
  by: string;
  name: string;
  role: string;
  on: DisplayDate;
  /** "10:05": the demo's clock. */
  time: string;
  method: "typed" | "drawn";
  /** The name as typed (also kept with a drawing). */
  typed: string;
  /** A drawn signature as an SVG path (no image bytes), or null. */
  path: string | null;
  reason: string | null;
  ref: string;
}

/** Where the paper lives in the app, for the SignBlock on that screen. */
export interface EsignHost { area: string; sourceId: string }

export interface EsignDoc {
  id: string;
  kind: EsignKind;
  title: string;
  /** Who the paper is about (employee id or profile key). */
  subjectId: string;
  subjectName: string;
  host: EsignHost;
  /** The document as shown and as hashed, line by line. */
  lines: string[];
  signers: EsignSigner[];
  /** Signatures made before the demo day. */
  seeded: EsignMark[];
  /** The joining pack it belongs to (a profile key), or null. */
  packKey: string | null;
}

export interface SigningProfile {
  /** Employee id, offer id, or the new-hire record id. */
  key: string;
  employeeId: string | null;
  offerId: string | null;
  name: string;
  role: string;
  email: string;
  /** The typed signature style chosen at registration. */
  style: SignStyle;
  registeredOn: DisplayDate;
  consentOn: DisplayDate;
  consent: string;
  source: "staff" | "offer" | "new-hire";
  display: { registered: string; source: string };
}

export type SignStyle = "Script" | "Slanted script" | "Upright script";
export const SIGN_STYLES: readonly SignStyle[] = ["Script",
  "Slanted script", "Upright script"];

export interface EsignPack {
  key: string;
  name: string;
  /** All seven papers, the offer letter first. */
  docIds: string[];
}

/* ---------------------------------------------------------------- *
 * Codes, text and helpers
 * ---------------------------------------------------------------- */

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function fnv(text: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** "ES-7K2M-QX4R": one per signature line, from the document id. */
export function esignRef(docId: string, order: number): string {
  const key = `${docId}#${order}`;
  const chars: string[] = [];
  for (const seed of [2166136261, 3339675911]) {
    let h = fnv(key, seed);
    for (let i = 0; i < 4; i++) {
      chars.push(ALPHABET[h & 31]!);
      h >>>= 5;
    }
  }
  return `ES-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

/** What is hashed: the version line, then the shown lines. */
export const esignText = (d: Pick<EsignDoc, "lines">): string =>
  [ESIGN_VERSION, ...d.lines].join("\n");

/** "first.last@zarqan-demo.test": a .test address, never a real one. */
export const esignEmail = (name: string): string =>
  `${name.toLowerCase().replace(/[^a-z ]/g, "").trim()
    .replace(/ +/g, ".")}@${DEMO_EMAIL_DOMAIN}`;

const styleOf = (key: string): SignStyle =>
  SIGN_STYLES[fnv(key, 7) % SIGN_STYLES.length]!;

const byId = (c: DemoCompany, id: string): DemoEmployee | undefined =>
  c.employees.find((e) => e.id === id);
const nameOf = (c: DemoCompany, id: string): string =>
  byId(c, id)?.fullName ?? id;
const roleOf = (c: DemoCompany, id: string): string => {
  const e = byId(c, id);
  return e === undefined ? "" : jobTitleText(e.jobKey);
};
const hrOf = (c: DemoCompany): string =>
  c.approvals.find((a) => a.kind === "pay-run")!.makerEmployeeId;
const gmOf = (c: DemoCompany): string =>
  c.approvals.find((a) => a.kind === "pay-run")!.checkerEmployeeId;

/** The person the employee role stands for (the overtime case). */
export const esignEmployeeOf = (c: DemoCompany): string =>
  c.employees.find((e) => e.cases.includes("overtime"))!.id;

const staff = (c: DemoCompany, order: number, id: string,
  party: SignerParty, signsAs: string): EsignSigner => ({ order,
  personId: id, name: nameOf(c, id), role: roleOf(c, id), signsAs,
  party });
const company = (c: DemoCompany, order: number, id: string) =>
  staff(c, order, id, "company", "For the company");
const employee = (c: DemoCompany, order: number, id: string) =>
  staff(c, order, id, "employee", "Employee");

/** A seeded signature: the clock runs from 09:10 by the line. */
function seed(doc: Pick<EsignDoc, "id" | "signers">, order: number,
  iso: string, verdict: EsignVerdict = "signed"): EsignMark {
  const s = doc.signers.find((x) => x.order === order)!;
  const min = 10 + (fnv(doc.id, order) % 40);
  return { order, verdict, by: s.personId, name: s.name, role: s.role,
    on: dateOf(iso), time: `09:${String(min).padStart(2, "0")}`,
    method: "typed", typed: s.name, path: null,
    reason: verdict === "declined" ? "Not as agreed" : null,
    ref: esignRef(doc.id, order) };
}

type Draft = Omit<EsignDoc, "seeded" | "title" | "packKey"> & {
  title?: string; packKey?: string | null };

function doc(d: Draft, signed: [number, string][] = []): EsignDoc {
  const base = { ...d, title: d.title ?? ESIGN_KIND_TITLE[d.kind],
    packKey: d.packKey ?? null };
  return { ...base, seeded: signed.map(([o, on]) => seed(base, o, on)) };
}

const head = (c: DemoCompany, title: string, ref: string,
  on: DisplayDate): string[] => [c.company.name, `${title}, ${ref}`,
  `Dated ${on.display}`, ""];

/* ---------------------------------------------------------------- *
 * Documents from the existing records
 * ---------------------------------------------------------------- */

const LETTER_KIND: Record<string, EsignKind> = {
  "salary-certificate": "salary-certificate", noc: "noc",
  experience: "experience-letter" };

function letterDocs(c: DemoCompany): EsignDoc[] {
  const gm = gmOf(c);
  return letters(c).map((l) => {
    const kind = LETTER_KIND[l.kind]!;
    const on = dateOf(addDays(l.requestedOn, 1));
    const body = kind === "salary-certificate"
      ? [`This is to confirm that ${l.display.name} works for ` +
        `${c.company.name} as ${roleOf(c, l.employeeId)}.`,
      `Monthly salary: ${l.display.salary}.`]
      : kind === "noc"
        ? [`${c.company.name} has no objection to ${l.display.name} ` +
          `applying for: ${l.purpose}.`]
        : [`${l.display.name} worked for ${c.company.name} as ` +
          `${roleOf(c, l.employeeId)}.`,
        "We thank them for their work and wish them well."];
    return doc({ id: `letter:${l.id}`, kind, subjectId: l.employeeId,
      subjectName: l.display.name, host: { area: "letters",
        sourceId: l.id },
      lines: [...head(c, ESIGN_KIND_TITLE[kind], l.reference.value, on),
        `To: ${l.addressee}`, ...body, `Purpose: ${l.purpose}`],
      signers: [company(c, 1, gm)] },
    l.status === "issued" ? [[1, on.iso]] : []);
  });
}

const offerLines = (c: DemoCompany, o: HiringOffer): string[] => {
  const req = requisitionViews(c).find((r) => r.id === o.requisitionId);
  const when = o.sentOn ?? o.preparedOn;
  return [...head(c, "Offer letter", o.number, when),
    `Dear ${o.candidateName},`,
    `We offer you the position of ${o.title}` +
      `${req === undefined ? "" : ` in ${req.departmentText}`}.`,
    `Monthly basic salary: ${o.basicText}`,
    `Total monthly pay: ${o.grossText}`,
    `Start date: ${o.joiningDate.display}`,
    `Probation: ${o.probationMonths} months`];
};

function offerDoc(c: DemoCompany, o: HiringOffer): EsignDoc {
  const hr = hrOf(c);
  const who = o.employeeId ?? o.id;
  const sent = (o.sentOn ?? o.preparedOn).iso;
  const marks: [number, string][] = o.status === "draft" ? []
    : o.status === "accepted" && o.respondedOn !== null
      ? [[1, sent], [2, o.respondedOn.iso]] : [[1, sent]];
  const d = doc({ id: `offer:${o.id}`, kind: "offer-letter",
    subjectId: who, subjectName: o.candidateName,
    host: { area: "offers", sourceId: o.id }, lines: offerLines(c, o),
    signers: [company(c, 1, hr), { order: 2, personId: who,
      name: o.candidateName, role: o.title, signsAs: "Candidate",
      party: "candidate" }],
    packKey: o.status === "accepted" ? who : null }, marks);
  if (o.status !== "declined" || o.respondedOn === null) return d;
  return { ...d, seeded: [...d.seeded, seed(d, 2, o.respondedOn.iso,
    "declined")] };
}

function warningDocs(c: DemoCompany): EsignDoc[] {
  return warnings(c).map((w) => {
    const on = w.evidence.at(-1) ?? dateOf(AS_OF);
    return doc({ id: `warning:${w.id}`, kind: "warning",
      title: `Warning letter: ${w.level.toLowerCase()}`,
      subjectId: w.employeeId, subjectName: w.display.name,
      host: { area: "warnings", sourceId: w.id },
      lines: [...head(c, "Warning letter", w.id.toUpperCase(), on),
        `To: ${w.display.name}`, `Level: ${w.level}`,
        `Reason: ${w.reason}`, w.deductionNote,
        "By signing, the employee confirms they have received this " +
          "letter. It does not mean they agree with it."],
      signers: [company(c, 1, w.issuedBy), { ...employee(c, 2,
        w.employeeId), signsAs: "Acknowledged by the employee" }] },
    w.status === "closed" ? [[1, on.iso], [2, addDays(on.iso, 1)]] : []);
  });
}

function revisionDocs(c: DemoCompany): EsignDoc[] {
  const gm = gmOf(c);
  return salaryRevisions(c).map((r, i) => {
    const on = dateOf(addDays(AS_OF, -12 + i * 6));
    return doc({ id: `revision:${r.id}`, kind: "salary-revision",
      subjectId: r.employeeId, subjectName: r.display.name,
      host: { area: "revisions", sourceId: r.id },
      lines: [...head(c, "Salary revision letter", r.id.toUpperCase(), on),
        `Dear ${r.display.name},`,
        `Your monthly basic salary changes from ${r.display.from} to ` +
          `${r.display.to}, from ${r.display.effective}.`,
        `Reason: ${r.reason}`, r.display.note],
      signers: [company(c, 1, gm), employee(c, 2, r.employeeId)] },
    i === 0 ? [[1, on.iso], [2, addDays(on.iso, 2)]] : [[1, on.iso]]);
  });
}

function loanDocs(c: DemoCompany): EsignDoc[] {
  const gm = gmOf(c);
  return loans(c).map((l) => {
    const on = dateOf(l.status === "closed" ? "2026-05-20" : l.kind ===
      "advance" ? "2026-10-26" : "2026-09-22");
    const word = l.kind === "loan" ? "Loan" : "Salary advance";
    const done = l.status !== "approved";
    return doc({ id: `loan:${l.ref}`, kind: "loan-agreement",
      title: `${word} agreement`, subjectId: l.employeeId,
      subjectName: l.display.name, host: { area: "loans", sourceId: l.ref },
      lines: [...head(c, `${word} agreement`, l.ref, on),
        `Borrower: ${l.display.name}`, `Amount: ${l.display.principal}`,
        `Monthly instalment: ${l.display.instalment}`,
        `First deduction: ${l.display.firstDeduction}`,
        "Each instalment is taken from salary and checked against the " +
          "deduction limits on the day."],
      signers: [employee(c, 1, l.employeeId), company(c, 2, gm)] },
    done ? [[1, on.iso], [2, addDays(on.iso, 1)]] : [[1, on.iso]]);
  });
}

function encashDocs(c: DemoCompany): EsignDoc[] {
  const hr = hrOf(c);
  return askSeeds(c).filter((a) => a.kind === "encash").map((a) => {
    const days = Number(a.values["halves"] ?? "0") / 2;
    const name = nameOf(c, a.employeeId);
    const marks: [number, string][] = [[1, a.raisedOn.iso],
      ...a.steps.map((s): [number, string] => [2, s.on.iso])];
    return doc({ id: `encash:${a.id}`, kind: "leave-encashment",
      subjectId: a.employeeId, subjectName: name,
      host: { area: "encash", sourceId: a.id },
      lines: [...head(c, "Leave encashment form", a.id.toUpperCase(),
        a.raisedOn), `Employee: ${name}`,
      `Unused annual leave to cash: ${days} days`,
      "Paid at one day of basic salary a day, in the next pay run."],
      signers: [employee(c, 1, a.employeeId), company(c, 2, hr)] },
    marks.slice(0, 2));
  });
}

function exitDocs(c: DemoCompany): EsignDoc[] {
  const gm = gmOf(c);
  const hr = hrOf(c);
  const settled = finalSettlements(c);
  return exitFlows(c).flatMap((x) => {
    const s = settled.find((y) => y.employeeId === x.employeeId);
    if (s === undefined) return [];
    const accepted = dateOf(addDays(s.lastDay, -30));
    const accept = doc({ id: `resign:${x.employeeId}`,
      kind: "resignation-acceptance", subjectId: x.employeeId,
      subjectName: x.name, host: { area: "ending", sourceId: x.employeeId },
      lines: [...head(c, "Resignation acceptance",
        `RA-${x.employeeId.slice(4)}`, accepted), `Dear ${x.name},`,
      `We accept your resignation. Your last working day is ` +
        `${s.display.lastDay}.`, `Notice: ${x.noticeText}`,
      `Reason given: ${x.reason}`],
      signers: [company(c, 1, gm)] }, [[1, accepted.iso]]);
    const receipt = doc({ id: `settle:${x.employeeId}`,
      kind: "settlement-receipt", subjectId: x.employeeId,
      subjectName: x.name, host: { area: "settlements",
        sourceId: x.employeeId },
      lines: [...head(c, "Final settlement receipt",
        `FS-${x.employeeId.slice(4)}`, dateOf(AS_OF)),
      `I, ${x.name}, have received my final settlement:`,
      `End of service gratuity: ${s.display.gratuity}`,
      `Unused leave pay: ${s.display.leavePay}`,
      `Total received: ${s.display.total}`,
      "Items not computed are listed with the settlement."],
      signers: [employee(c, 1, x.employeeId), company(c, 2, hr)] });
    return [accept, receipt];
  });
}

function probationDocs(c: DemoCompany): EsignDoc[] {
  const gm = gmOf(c);
  return probationEvaluationViews(c).filter((p) => p.status ===
    "confirmed" && p.evaluatedOn !== null).map((p) => {
    const on = p.evaluatedOn!;
    return doc({ id: `probation:${p.employeeId}`,
      kind: "probation-confirmation", subjectId: p.employeeId,
      subjectName: p.employeeName, host: { area: "probation",
        sourceId: p.id },
      lines: [...head(c, "Probation confirmation",
        `PC-${p.employeeId.slice(4)}`, on), `Dear ${p.employeeName},`,
      `Your probation as ${p.title} ended on ${p.probationEnd.display}.`,
      "We confirm your employment with the company."],
      signers: [company(c, 1, gm), employee(c, 2, p.employeeId)] },
    [[1, on.iso], [2, addDays(on.iso, 1)]]);
  });
}

/** Acknowledgements not yet given, and the employee's own record. */
function policyDocs(c: DemoCompany): EsignDoc[] {
  const me = esignEmployeeOf(c);
  return policies(c).flatMap((p) => p.acks.filter((a) => !a.done ||
    a.employeeId === me).map((a) => doc({
    id: `policy:${p.id}:${a.employeeId}`, kind: "policy-ack",
    title: `Policy acknowledgement: ${p.name}`, subjectId: a.employeeId,
    subjectName: a.name, host: { area: "policies", sourceId: p.id },
    lines: [c.company.name, `${p.name}, version ${p.version}`,
      `In effect from ${p.effectiveOn.display}`, "", p.summary,
      `I, ${a.name}, have read this policy and will follow it.`],
    signers: [employee(c, 1, a.employeeId)] },
  a.done && a.doneOn !== null ? [[1, a.doneOn.iso]] : [])));
}

/** The employee's own: the 2026 privacy notice and new bank details. */
function ownDocs(c: DemoCompany): EsignDoc[] {
  const me = esignEmployeeOf(c);
  const name = nameOf(c, me);
  const on = dateOf(addDays(AS_OF, -3));
  return [
    doc({ id: `privacy:${me}`, kind: "data-privacy",
      title: "Data privacy notice, 2026 edition", subjectId: me,
      subjectName: name, host: { area: "privacy", sourceId: me },
      lines: privacyLines(c, name, on), signers: [employee(c, 1, me)] }),
    doc({ id: `bank:${me}`, kind: "bank-details", subjectId: me,
      subjectName: name, host: { area: "bank", sourceId: me },
      lines: bankLines(c, name, on), signers: [employee(c, 1, me)] }),
  ];
}

const privacyLines = (c: DemoCompany, name: string,
  on: DisplayDate): string[] => [...head(c, "Data privacy notice",
  "DPN-2026", on), `To: ${name}`,
"We keep your contact, identity, pay and attendance records to run " +
  "payroll and HR.", "We share them only with the bank that pays your " +
  "salary and with the authorities that ask for them.",
"You can ask to see or correct them at any time through HR.",
"I have read this notice."];

const bankLines = (c: DemoCompany, name: string,
  on: DisplayDate): string[] => [...head(c, "Bank details form",
  "BDF-1", on), `Employee: ${name}`,
"Please pay my salary into the account I entered in my profile.",
"I will tell HR before the next payday if it changes."];

/* ---------------------------------------------------------------- *
 * Registration and the joining pack
 * ---------------------------------------------------------------- */

/** What a new person's registration needs (a hire or an offer). */
export interface Joiner {
  key: string;
  employeeId: string | null;
  offerId: string | null;
  name: string;
  title: string;
  /** ISO: the first day of work. */
  startOn: string;
  /** ISO: when the person was registered. */
  registeredOn: string;
  source: SigningProfile["source"];
}

const SOURCE_WORD: Record<SigningProfile["source"], string> = {
  staff: "Registered at joining", offer: "Registered when the offer " +
    "was accepted", "new-hire": "Registered when HR added the record" };

/** The signing profile made for a person on the day they register. */
export function signingProfile(j: Joiner): SigningProfile {
  const on = dateOf(j.registeredOn);
  const early = j.source === "staff" && j.registeredOn === ESIGN_START;
  return { key: j.key, employeeId: j.employeeId, offerId: j.offerId,
    name: j.name, role: j.title, email: esignEmail(j.name),
    style: styleOf(j.key), registeredOn: on, consentOn: on,
    consent: ESIGN_CONSENT, source: j.source,
    display: { registered: on.display, source: early ? "Registered when " +
      "the system started" : SOURCE_WORD[j.source] } };
}

/** The seven-paper joining pack, the offer letter reused if there is one. */
export function joiningPack(c: DemoCompany, j: Joiner,
  signedFirst = 0): { pack: EsignPack; docs: EsignDoc[] } {
  const gm = gmOf(c);
  const hr = hrOf(c);
  const on = dateOf(j.registeredOn);
  const me: EsignSigner = { order: 1, personId: j.key, name: j.name,
    role: j.title, signsAs: j.employeeId === null ? "New employee"
      : "Employee", party: "employee" };
  const ref = (k: string): string => `${k}-${j.key.replace(/^\D+/, "")}`;
  const one = (kind: EsignKind, lines: string[],
    extra: EsignSigner[] = []): Draft => ({ id: `pack:${j.key}:${kind}`,
    kind, subjectId: j.key, subjectName: j.name,
    host: { area: "pack", sourceId: j.key }, lines,
    signers: [me, ...extra], packKey: j.key });
  const offer = j.offerId === null ? null
    : offerViews(c).find((o) => o.id === j.offerId) ?? null;
  const drafts: Draft[] = [
    ...(offer !== null ? [] : [one("offer-letter", [...head(c,
      "Offer letter", ref("OL"), on), `Dear ${j.name},`,
    `We offer you the position of ${j.title}.`,
    `Start date: ${dateOf(j.startOn).display}`],
    [{ ...company(c, 0, hr) }])]),
    one("employment-contract", [...head(c, "Employment contract",
      ref("EC"), on), `Employee: ${j.name}`, `Position: ${j.title}`,
    `Start date: ${dateOf(j.startOn).display}`,
    "Pay, hours and leave as the offer letter sets out."],
    [company(c, 2, gm)]),
    one("confidentiality", [...head(c, "Confidentiality agreement",
      ref("CA"), on), `I, ${j.name}, will keep customer and company ` +
      "information private, during my work and after it ends."]),
    one("code-of-conduct", [...head(c, "Code of conduct", ref("CC"), on),
      `I, ${j.name}, have read the code of conduct and will follow it.`]),
    one("data-privacy", privacyLines(c, j.name, on).map((l, i) =>
      i === 1 ? `Data privacy notice, ${ref("DPN")}` : l)),
    one("policy-ack", [...head(c, "Policy acknowledgements", ref("PA"),
      on), "Staff handbook; leave and absence; expenses and travel; " +
      "health and safety.", `I, ${j.name}, have read these policies.`],
    ),
    one("bank-details", bankLines(c, j.name, on).map((l, i) =>
      i === 1 ? `Bank details form, ${ref("BDF")}` : l)),
  ];
  const docs = drafts.map((d, i) => {
    const sorted = [...d.signers].sort((a, b) => a.order - b.order)
      .map((s, k) => ({ ...s, order: k + 1 }));
    const x = { ...d, signers: sorted };
    const n = i < signedFirst ? sorted.map((s): [number, string] =>
      [s.order, addDays(j.startOn, Math.min(i, 3))]) : [];
    return doc(x, n);
  });
  const offerId = offer === null ? [] : [`offer:${offer.id}`];
  return { pack: { key: j.key, name: j.name,
    docIds: [...offerId, ...docs.map((d) => d.id)] }, docs };
}

/** People who joined in the last 60 days: their pack is still open. */
const recent = (c: DemoCompany): DemoEmployee[] => c.employees.filter(
  (e) => e.leavingDate === null && e.joiningDate <= AS_OF &&
    e.joiningDate > addDays(AS_OF, -60));

/** Accepted offers whose person is not yet on the staff list. */
const acceptedOffers = (c: DemoCompany): HiringOffer[] =>
  offerViews(c, "accepted").filter((o) => o.employeeId === null);

const joinerOfStaff = (e: DemoEmployee, offerId: string | null = null)
  : Joiner => ({ key: e.id, employeeId: e.id, offerId, name: e.fullName,
  title: jobTitleText(e.jobKey), startOn: e.joiningDate,
  registeredOn: e.joiningDate < ESIGN_START ? ESIGN_START : e.joiningDate,
  source: "staff" });

/** A candidate whose offer is accepted, registered that day. */
export const joinerOfOffer = (o: HiringOffer, on: string): Joiner => ({
  key: o.id, employeeId: null, offerId: o.id, name: o.candidateName,
  title: o.title, startOn: o.joiningDate.iso, registeredOn: on,
  source: "offer" });

/** Everyone registered before the demo day: staff and accepted offers. */
export function signingProfiles(c: DemoCompany): SigningProfile[] {
  const people = c.employees.filter((e) => e.leavingDate === null ||
    e.leavingDate >= AS_OF).map((e) => signingProfile(joinerOfStaff(e)));
  const offers = acceptedOffers(c).map((o) => signingProfile(joinerOfOffer(
    o, o.respondedOn?.iso ?? AS_OF)));
  return [...people, ...offers];
}

/** Joining packs open before the demo day (recent staff, offers). */
export function esignPacks(c: DemoCompany): { packs: EsignPack[];
  docs: EsignDoc[] } {
  const made = [
    ...recent(c).map((e) => {
      const o = offerViews(c).find((x) => x.employeeId === e.id);
      return joiningPack(c, joinerOfStaff(e, o?.id ?? null),
        o === undefined ? 5 : 4);
    }),
    ...acceptedOffers(c).map((o) => joiningPack(c, joinerOfOffer(o,
      o.respondedOn?.iso ?? AS_OF), 0)),
  ];
  return { packs: made.map((m) => m.pack), docs: made.flatMap((m) =>
    m.docs) };
}

/** Every document that needs a signature, as it stood on the demo day. */
export function esignDocs(c: DemoCompany): EsignDoc[] {
  return [...letterDocs(c), ...offerViews(c).map((o) => offerDoc(c, o)),
    ...warningDocs(c), ...revisionDocs(c), ...loanDocs(c),
    ...encashDocs(c), ...exitDocs(c), ...probationDocs(c),
    ...policyDocs(c), ...ownDocs(c), ...esignPacks(c).docs];
}

/** Joiners from the candidates board (a hire on the moves screens). */
export const esignJoinerIds = (c: DemoCompany): string[] =>
  movesDataOf(c).joiners.map((j) => j.id);

/* ---------------------------------------------------------------- *
 * Status
 * ---------------------------------------------------------------- */

export type EsignWord = "Awaiting signature" | "Signed" | "Declined";

export interface EsignLine { signer: EsignSigner; mark: EsignMark | null }

export interface EsignProgress {
  word: EsignWord;
  lines: EsignLine[];
  /** Whose turn it is, or null when signed or declined. */
  next: EsignSigner | null;
  signed: number;
}

/**
 * Folds marks onto a document's signers, in order. A mark counts only
 * on its signer's turn (every earlier signer has signed) and only once;
 * a refusal stops the document.
 */
export function esignProgress(d: EsignDoc,
  extra: readonly EsignMark[] = []): EsignProgress {
  const signers = [...d.signers].sort((a, b) => a.order - b.order);
  const got = new Map<number, EsignMark>();
  let stopped = false;
  for (const m of [...d.seeded, ...extra]) {
    if (stopped || got.has(m.order)) continue;
    const turn = signers.find((s) => !got.has(s.order));
    if (turn === undefined || turn.order !== m.order) continue;
    got.set(m.order, m);
    if (m.verdict === "declined") stopped = true;
  }
  const lines = signers.map((s) => ({ signer: s,
    mark: got.get(s.order) ?? null }));
  const signed = lines.filter((l) => l.mark?.verdict === "signed").length;
  if (stopped) return { word: "Declined", lines, next: null, signed };
  const next = lines.find((l) => l.mark === null)?.signer ?? null;
  return { word: next === null ? "Signed" : "Awaiting signature", lines,
    next, signed };
}
