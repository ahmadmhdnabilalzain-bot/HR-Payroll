import type { Role } from "./state";

/**
 * D5: electronic signing during the demo. One append-only log: a
 * signature, a refusal, an undo (itself an entry) or a reminder. Every
 * entry names who (a person id, or a new person's profile key), their
 * name and title as they signed, the role, the demo's date and the
 * demo clock. Nothing is ever removed, so the log is the audit trail.
 * A drawn signature is kept as an SVG path, never as image bytes.
 */
export interface EsignWho {
  by: string;
  name: string;
  title: string;
  role: Role;
  /** ISO, the demo's date. */
  on: string;
}

export interface EsignSign extends EsignWho {
  kind: "sign";
  docId: string;
  order: number;
  verdict: "signed" | "declined";
  method: "typed" | "drawn";
  typed: string;
  path: string | null;
  reason: string | null;
  /** SHA-256 of the document text, worked out in the browser. */
  fingerprint: string;
}

export interface EsignUndo extends EsignWho {
  kind: "undo";
  /** The seq of the signature taken back. */
  target: number;
  docId: string;
}

export interface EsignRemind extends EsignWho {
  kind: "remind";
  /** A joining pack's key, or one document's id. */
  target: string;
}

export type EsignDraft = EsignSign | EsignUndo | EsignRemind;
export type EsignEvent = EsignDraft & { seq: number; time: string };

export interface EsignSlice {
  esignLog: EsignEvent[];
  /** Counter for seq: made in the reducer, so StrictMode stays sound. */
  nextEsign: number;
}

export type EsignAction = { type: "esign"; entry: EsignDraft };

export const ESIGN_INITIAL: EsignSlice = { esignLog: [], nextEsign: 1 };

/** The demo clock: 10:02 for the first entry, two minutes apart. */
export function esignClock(seq: number): string {
  const m = 10 * 60 + seq * 2;
  const hh = String(Math.floor(m / 60) % 24).padStart(2, "0");
  return `${hh}:${String(m % 60).padStart(2, "0")}`;
}

const undone = (log: readonly EsignEvent[]): Set<number> =>
  new Set(log.flatMap((e) => e.kind === "undo" ? [e.target] : []));

/** Signatures and refusals still standing, oldest first. */
export const liveSigns = (log: readonly EsignEvent[])
  : (EsignSign & { seq: number; time: string })[] => {
  const gone = undone(log);
  return log.flatMap((e) => e.kind === "sign" && !gone.has(e.seq)
    ? [e] : []);
};

/** The one entry that may be undone on a document, by this person. */
export function undoable(log: readonly EsignEvent[], docId: string,
  by: string): number | null {
  const last = liveSigns(log).filter((e) => e.docId === docId).at(-1);
  return last !== undefined && last.by === by ? last.seq : null;
}

export function reduceEsign<S extends EsignSlice>(s: S, a: EsignAction)
  : S {
  const e = a.entry;
  if (e.kind === "undo" && undoable(s.esignLog, e.docId, e.by) !==
    e.target) return s;
  if (e.kind === "sign" && liveSigns(s.esignLog).some((x) =>
    x.docId === e.docId && x.order === e.order)) return s;
  const n = s.nextEsign;
  return { ...s, nextEsign: n + 1,
    esignLog: [...s.esignLog, { ...e, seq: n, time: esignClock(n) }] };
}
