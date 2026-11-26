import type { AskSeed } from "./data/files-types";
import type { Role } from "./state";

/**
 * What was done on the WP17 screens during the demo (exit interviews,
 * signatures, files, leave pay, corrections, clock-ins). One slice in
 * the demo store behind one action type, `files`. Every entry names
 * who, their role and the demo's date, and has an undo. Files are
 * never stored here, only their names and sizes (the bytes stay in
 * people/files/blobs.ts, in this tab's memory).
 */
export interface Who { by: string; role: Role; on: string }

export interface ExitPlan extends Who { id: string; employeeId: string;
  plannedOn: string }
export interface ExitForm extends Who { reasonId: string;
  ratings: Record<string, number>; comment: string }
export interface SigStep extends Who { typed: string }
export interface Ask extends Who { id: string; kind: "encash" | "correction";
  employeeId: string; values: Record<string, string> }
export interface AskStep extends Who { stage: "hr" | "gm";
  verdict: "signed-off" | "declined" }
export interface Upload extends Who { employeeId: string; docType: string;
  version: number; fileName: string; bytes: number; note: string }
export interface ClockEvent extends Who { id: string; employeeId: string;
  via: "phone" | "kiosk"; site: string; inside: boolean; time: string }

export interface FilesSlice {
  exitPlans: ExitPlan[];
  exitForms: Record<string, ExitForm>;
  /** Document id to who asked for the signature. */
  signAsks: Record<string, Who>;
  signed: Record<string, SigStep>;
  asks: Ask[];
  askSteps: Record<string, AskStep[]>;
  uploads: Upload[];
  clocks: ClockEvent[];
  /** Counter for ids: made in the reducer, so StrictMode stays sound. */
  nextFile: number;
}

export type FilesOp =
  | { op: "exit-plan"; employeeId: string; plannedOn: string; who: Who }
  | { op: "exit-unplan"; id: string }
  | { op: "exit-record"; id: string; form: ExitForm }
  | { op: "exit-unrecord"; id: string }
  | { op: "sign-ask"; docId: string; who: Who }
  | { op: "sign-unask"; docId: string }
  | { op: "sign"; docId: string; step: SigStep }
  | { op: "unsign"; docId: string }
  | { op: "ask-new"; draft: Omit<Ask, "id"> }
  | { op: "ask-step"; id: string; step: AskStep }
  | { op: "ask-unstep"; id: string }
  | { op: "upload"; file: Upload }
  | { op: "unupload"; employeeId: string; docType: string;
    version: number }
  | { op: "clock"; draft: Omit<ClockEvent, "id"> }
  | { op: "unclock"; id: string };

export const FILES_INITIAL: FilesSlice = { exitPlans: [], exitForms: {},
  signAsks: {}, signed: {}, asks: [], askSteps: {}, uploads: [],
  clocks: [], nextFile: 1 };

function without<T>(r: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _gone, ...rest } = r;
  return rest;
}

export function reduceFiles<S extends FilesSlice>(s: S, a: FilesOp): S {
  switch (a.op) {
    case "exit-plan": return { ...s, nextFile: s.nextFile + 1,
      exitPlans: [{ ...a.who, id: `xi-new-${s.nextFile}`,
        employeeId: a.employeeId, plannedOn: a.plannedOn },
      ...s.exitPlans] };
    case "exit-unplan": return { ...s, exitPlans: s.exitPlans
      .filter((x) => x.id !== a.id), exitForms: without(s.exitForms, a.id) };
    case "exit-record": return { ...s,
      exitForms: { ...s.exitForms, [a.id]: a.form } };
    case "exit-unrecord": return { ...s,
      exitForms: without(s.exitForms, a.id) };
    case "sign-ask": return { ...s,
      signAsks: { ...s.signAsks, [a.docId]: a.who } };
    case "sign-unask": return { ...s,
      signAsks: without(s.signAsks, a.docId) };
    case "sign": return { ...s, signed: { ...s.signed, [a.docId]: a.step } };
    case "unsign": return { ...s, signed: without(s.signed, a.docId) };
    case "ask-new": return { ...s, nextFile: s.nextFile + 1,
      asks: [{ ...a.draft, id: `ask-new-${s.nextFile}` }, ...s.asks] };
    case "ask-step": return { ...s, askSteps: { ...s.askSteps,
      [a.id]: [...(s.askSteps[a.id] ?? []), a.step] } };
    case "ask-unstep": return { ...s, askSteps: { ...s.askSteps,
      [a.id]: (s.askSteps[a.id] ?? []).slice(0, -1) } };
    case "upload": return { ...s, uploads: [...s.uploads, a.file] };
    case "unupload": return { ...s, uploads: s.uploads.filter((u) =>
      !(u.employeeId === a.employeeId && u.docType === a.docType &&
        u.version === a.version)) };
    case "clock": return { ...s, nextFile: s.nextFile + 1,
      clocks: [{ ...a.draft, id: `clk-${s.nextFile}` }, ...s.clocks] };
    case "unclock": return { ...s,
      clocks: s.clocks.filter((x) => x.id !== a.id) };
  }
}

export type AskNow = "waiting-hr" | "waiting-gm" | "signed-off" | "declined";

export interface AskRow {
  id: string;
  kind: Ask["kind"];
  employeeId: string;
  values: Record<string, string>;
  raisedBy: string;
  /** ISO date raised. */
  raisedOn: string;
  /** Steps taken: the sample's own, then those made in the demo. */
  steps: { stage: "hr" | "gm"; verdict: "signed-off" | "declined";
    by: string; role: Role | null; on: string }[];
  now: AskNow;
  isNew: boolean;
}

export function askNow(steps: { stage: string; verdict: string }[])
  : AskNow {
  if (steps.some((x) => x.verdict === "declined")) return "declined";
  if (steps.some((x) => x.stage === "gm")) return "signed-off";
  return steps.some((x) => x.stage === "hr") ? "waiting-gm" : "waiting-hr";
}

/** Every request: the sample's and the demo's, newest first. */
export function askRows(seeds: readonly AskSeed[], s: FilesSlice,
  kind: Ask["kind"]): AskRow[] {
  const made = s.asks.filter((x) => x.kind === kind).map((x): AskRow => {
    const steps = (s.askSteps[x.id] ?? []).map((t) => ({ ...t }));
    return { id: x.id, kind: x.kind, employeeId: x.employeeId,
      values: x.values, raisedBy: x.by, raisedOn: x.on,
      steps, now: askNow(steps), isNew: true };
  });
  const base = seeds.filter((x) => x.kind === kind).map((x): AskRow => {
    const steps = [...x.steps.map((t) => ({ stage: t.stage,
      verdict: "signed-off" as const, by: t.by, role: null, on: t.on.iso })),
    ...(s.askSteps[x.id] ?? []).map((t) => ({ ...t }))];
    return { id: x.id, kind: x.kind, employeeId: x.employeeId,
      values: x.values, raisedBy: x.raisedBy, raisedOn: x.raisedOn.iso,
      steps, now: askNow(steps), isNew: false };
  });
  return [...made, ...base];
}

/** Requests waiting for this role to decide. */
export function waitingFor(rows: readonly AskRow[], role: Role): number {
  const stage = role === "hr" ? "waiting-hr" : role === "gm"
    ? "waiting-gm" : null;
  return stage === null ? 0 : rows.filter((r) => r.now === stage).length;
}
