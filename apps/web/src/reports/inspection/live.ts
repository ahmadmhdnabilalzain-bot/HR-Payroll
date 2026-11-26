import { runPhase } from "../../demo/derive";
import { useDemo } from "../../demo/state";
import type { AuditData } from "./data";

type Pack = AuditData["packs"][string];
type Remedy = AuditData["remedies"][number];

/** The month the demo story runs in; earlier months are history. */
const LIVE_MONTH = "2026-10";
/** Checks that hold the whole run (demo-data wpe-audit.ts STOPS_PAY). */
const STOPS = ["SIF_HELD_NO_IBAN", "IBAN_CHECKSUM"];

/** `exc-CODE-emp-001` or `file-CODE-emp-001`: the code and the person. */
function parts(id: string): { code: string; who: string } | null {
  const m = /^(?:exc|file)-([A-Z_]+)-(.*)$/.exec(id);
  return m === null ? null : { code: m[1]!, who: m[2]! };
}

/**
 * The October pack and the error record are built once from the demo
 * company; the story (an IBAN entered, a check marked reviewed, the
 * run signed off) changes them as it changes Home.
 */
function useLive() {
  const { data, state } = useDemo();
  const phase = runPhase(data, state);
  const issues = data.issues();
  const live = (code: string, who: string) => issues.find((i) =>
    i.code === code && (i.employeeId ?? i.subjectId ?? "") === who);
  const fixed = (code: string, who: string): boolean =>
    STOPS.includes(code) && live(code, who) === undefined;
  const reviewed = (code: string, who: string): boolean => {
    const i = live(code, who);
    return i !== undefined && state.resolved[i.id] !== undefined;
  };
  return { phase, fixed, reviewed };
}

export function useLivePack(pack: Pack, month: string): Pack {
  const { phase, fixed, reviewed } = useLive();
  if (month !== LIVE_MONTH) return pack;
  const signed = phase === "file";
  return { ...pack,
    statusText: signed ? "Signed off, not paid yet"
      : phase === "declined" ? "Sent back to HR" : pack.statusText,
    signOffs: pack.signOffs.map((x) => x.kindText !== "Pay run" ||
      x.decidedOn !== "Not yet" || (!signed && phase !== "declined") ? x
      : { ...x, outcomeText: signed ? "Signed off" : "Declined",
        decidedOn: "27 Oct 2026" }),
    exceptions: pack.exceptions.map((x) => {
      const p = parts(x.id);
      if (p === null) return x;
      if (fixed(p.code, p.who)) {
        return { ...x, severityText: "Fixed",
          statusText: "IBAN entered; the pay is in the salary file" };
      }
      if (reviewed(p.code, p.who)) return { ...x, statusText: "Reviewed" };
      return signed && !STOPS.includes(p.code)
        ? { ...x, statusText: "Open: left to review in the next run" } : x;
    }) };
}

export function useLiveRemedies(rows: Remedy[]): Remedy[] {
  const { fixed } = useLive();
  return rows.map((r) => {
    const p = parts(r.id);
    return p !== null && fixed(p.code, p.who)
      ? { ...r, paidIn: "Fixed: in the October salary file", open: false,
        statusText: "Fixed" } : r;
  });
}
