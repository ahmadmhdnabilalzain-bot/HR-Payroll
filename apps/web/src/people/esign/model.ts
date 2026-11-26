import { sha256 } from "../../api/mock/sha256";
import type {
  EsignDoc,
  EsignMark,
  EsignPack,
  EsignProgress,
  SigningProfile,
} from "../../demo/data/esign-types";
import type { DemoData } from "../../demo/data/types";
import { liveSigns, type EsignEvent } from "../../demo/esign-state";
import type { NewHire } from "../../demo/more-state";
import type { Action, DemoState } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { offerNow } from "../moves/view";
import { letterRows } from "../papers/model";

/**
 * D5: the signing world as the demo stands. The day's papers, plus a
 * profile and a seven-paper pack for every person registered in the
 * demo: a new employee record (P04) or an offer accepted. Registration
 * is worked out from those records, so every path that brings a person
 * in registers them, and taking a record back takes the profile away.
 */
export interface EsignWorld {
  docs: EsignDoc[];
  packs: EsignPack[];
  profiles: SigningProfile[];
  /** Packs whose record the General manager declined. */
  closed: Set<string>;
}

type S = DemoState;

const hireKey = (h: NewHire): string => h.offerId ?? h.id;

export function esignWorld(d: DemoData, s: S): EsignWorld {
  const known = new Set(d.esign.profiles().map((p) => p.key));
  const docs = [...d.esign.docs()];
  const packs = [...d.esign.packs()];
  const profiles = [...d.esign.profiles()];
  const closed = new Set<string>();
  const add = (j: Parameters<DemoData["esign"]["pack"]>[0]): void => {
    if (known.has(j.key)) return;
    known.add(j.key);
    profiles.push(d.esign.profile(j));
    const made = d.esign.pack(j);
    packs.push(made.pack);
    docs.push(...made.docs);
  };
  for (const o of d.moves.offers()) {
    if (o.status !== "accepted" && offerNow(o, s) === "accepted") {
      const j = d.esign.joinerOfOffer(o.id, d.esign.asOf);
      if (j !== null) add(j);
    }
  }
  const jobs = d.more.options().jobs;
  for (const h of s.newHires.filter((x) => !x.withdrawn)) {
    const key = hireKey(h);
    add({ key, employeeId: null, offerId: h.offerId, name: h.name,
      title: jobs.find((j) => j.jobKey === h.jobKey)?.title ?? h.jobKey,
      startOn: h.startOn, registeredOn: h.requestedOn,
      source: "new-hire" });
    if (s.decided[h.approvalId] === "decline") closed.add(key);
  }
  return { docs, packs, profiles, closed };
}

/** A signature made in the demo, as the package's mark. */
function markOf(d: DemoData, e: ReturnType<typeof liveSigns>[number])
  : EsignMark {
  return { order: e.order, verdict: e.verdict, by: e.by, name: e.name,
    role: e.title, on: d.esign.date(e.on), time: e.time,
    method: e.method, typed: e.typed, path: e.path, reason: e.reason,
    ref: d.esign.ref(e.docId, e.order) };
}

/**
 * Marks the other screens made: a letter issued on the Letters screen
 * is the General manager's signature; an offer sent, accepted or
 * declined on the Offers screen is HR's and the candidate's.
 */
function screenMarks(d: DemoData, s: S, doc: EsignDoc): EsignMark[] {
  const at = (order: number, verdict: EsignMark["verdict"] = "signed")
    : EsignMark => {
    const x = doc.signers.find((y) => y.order === order)!;
    return { order, verdict, by: x.personId, name: x.name, role: x.role,
      on: d.esign.date(d.esign.asOf), time: "09:00", method: "typed",
      typed: x.name, path: null, reason: null,
      ref: d.esign.ref(doc.id, order) };
  };
  if (doc.host.area === "letters") {
    const l = letterRows(d, s).find((x) => x.id === doc.host.sourceId);
    return l?.status === "issued" ? [at(1)] : [];
  }
  if (doc.kind === "policy-ack") {
    const m = s.safetyMarks[`ack:${doc.host.sourceId}:${doc.subjectId}`];
    return m === undefined ? [] : [at(1)];
  }
  if (doc.host.area === "offers") {
    const o = d.moves.offers().find((x) => x.id === doc.host.sourceId);
    if (o === undefined) return [];
    const v = offerNow(o, s);
    return v === "draft" ? [] : v === "sent" ? [at(1)]
      : [at(1), at(2, v === "declined" ? "declined" : "signed")];
  }
  return [];
}

export interface EsignRow { doc: EsignDoc; progress: EsignProgress }

export function rowOf(d: DemoData, s: S, doc: EsignDoc): EsignRow {
  const made = liveSigns(s.esignLog).filter((e) => e.docId === doc.id)
    .map((e) => markOf(d, e));
  return { doc, progress: d.esign.progress(doc,
    [...made, ...screenMarks(d, s, doc)]) };
}

/** Rows per (data, state) pair: the nav counts and screens share them. */
const cache = new WeakMap<DemoData, WeakMap<S, EsignRow[]>>();

export function esignRows(d: DemoData, s: S, w?: EsignWorld): EsignRow[] {
  const byState = cache.get(d) ?? new WeakMap<S, EsignRow[]>();
  cache.set(d, byState);
  const hit = byState.get(s);
  if (hit !== undefined) return hit;
  const rows = (w ?? esignWorld(d, s)).docs.map((doc) => rowOf(d, s, doc));
  byState.set(s, rows);
  return rows;
}

/** Who signs in the demo as the current role (a person id). */
export const actorOf = (d: DemoData, s: Pick<DemoState, "role">): string =>
  personFor(d, s.role);

/** Papers waiting for this signer, in the world given. */
export const waitingFor = (rows: readonly EsignRow[], who: string)
  : EsignRow[] => rows.filter((r) => r.progress.next?.personId === who);

/** "Signing pack: 3 of 7 signed". */
export function packCount(rows: readonly EsignRow[], p: EsignPack)
  : { signed: number; total: number } {
  const ids = new Set(p.docIds);
  return { total: p.docIds.length, signed: rows.filter((r) =>
    ids.has(r.doc.id) && r.progress.word === "Signed").length };
}

/** The pack for a P04 record (by its offer, else by its own id). */
export const packKeyOf = (h: NewHire): string => hireKey(h);

/** SHA-256 of the text, hex; worked out in the browser on demand. */
export const fingerprintOf = (d: DemoData, doc: EsignDoc): string =>
  sha256(d.esign.text(doc));

/** "3f9a 1c0e ..." for reading aloud and on a phone. */
export const groupHex = (hex: string): string =>
  (hex.match(/.{1,4}/g) ?? []).join(" ");

/** The latest reminder for a pack or a paper, or null. */
export function lastReminder(log: readonly EsignEvent[], target: string)
  : EsignEvent | null {
  return log.filter((e) => e.kind === "remind" && e.target === target)
    .at(-1) ?? null;
}

/** Every step on one paper: the earlier ones, then the demo's log. */
export interface TrailLine { key: string; what: string; who: string;
  when: string }

export function trailOf(d: DemoData, s: S, row: EsignRow): TrailLine[] {
  const seeded = row.doc.seeded.map((m) => ({ key: `seed-${m.order}`,
    what: m.verdict === "signed" ? "Signed" : "Declined",
    who: `${m.name}, ${m.role}`, when: `${m.on.display}, ${m.time}` }));
  const log = s.esignLog.filter((e) => (e.kind === "sign" ||
    e.kind === "undo") && e.docId === row.doc.id || e.kind === "remind" &&
    (e.target === row.doc.id || e.target === row.doc.packKey))
    .map((e) => ({ key: `log-${e.seq}`, what: e.kind === "undo"
      ? "Signature taken back" : e.kind === "remind" ? "Reminder sent"
        : e.verdict === "signed" ? `Signed (${e.method === "typed"
          ? "typed name" : "drawn signature"})` : "Declined",
    who: `${e.name}, ${e.title}`,
    when: `${d.esign.date(e.on).display}, ${e.time}` }));
  return [...seeded, ...log];
}

/** The policy screen's own mark for an acknowledgement paper. */
export const ackKey = (row: EsignRow): string =>
  `ack:${row.doc.host.sourceId}:${row.doc.subjectId}`;

/**
 * What an undo takes back on the paper's own screen: the letter's
 * issue and the policy's read mark (only if the entry was a signature,
 * since a refusal made no step there), and the offer's answer.
 */
export function undoSteps(row: EsignRow, by: string, signed: boolean)
  : Action[] {
  const h = row.doc.host;
  const out: Action[] = [];
  if (h.area === "letters" && signed) {
    out.push({ type: "paper-undo", id: h.sourceId });
  }
  if (row.doc.kind === "policy-ack" && signed) {
    out.push({ type: "safety-unmark", key: ackKey(row) });
  }
  if (h.area === "offers" && row.doc.signers.some((x) =>
    x.party === "candidate" && x.personId === by)) {
    out.push({ type: "move-undo", key: `offer:${h.sourceId}` });
  }
  return out;
}
