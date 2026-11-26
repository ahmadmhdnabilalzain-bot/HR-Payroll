import type { TraceLine, TraceRule } from "../trace-types";
import type { Interval } from "./intervals";
import type { DayInput, DaySheet } from "./types";

/** Overtime with what produced it, for the trace. */
export interface Overtime {
  minutes: number;
  night: number;
  /** Daily normal limit used without a shift; null with a shift. */
  limit: number | null;
  /** Night-window minutes of the candidate time, before the cap. */
  nightPool: number;
  rules: TraceRule[];
  nightRules: TraceRule[];
}

export type Fields = Omit<DaySheet, "date" | "kind" | "flags" | "trace">;

export interface TraceCtx {
  clocked: number;
  merged: Interval[];
  ot: Overtime;
}

const str = (n: number | null | undefined) =>
  n === null || n === undefined ? "none" : String(n);

function line(id: string, label: string, formula: string, result: number,
  inputs: Record<string, string>, rules: TraceRule[] = []): TraceLine {
  return { id, label, formula, inputs, result: String(result), rules };
}

function shiftInputs(day: DayInput): Record<string, string> {
  const s = day.shift;
  return { shiftStart: str(s?.start), shiftEnd: str(s?.end),
    breakMinutes: str(s?.breakMinutes), leave: day.leave, kind: day.kind };
}

function lateEarlyLines(day: DayInput, f: Fields, c: TraceCtx):
  TraceLine[] {
  const base = shiftInputs(day);
  const first = c.merged[0]?.start;
  const last = c.merged[c.merged.length - 1]?.end;
  return [
    line("time.late", "Late minutes",
      "max(0, first start - shift start); 0 on am or full leave",
      f.lateMinutes, { ...base, firstStart: str(first) }),
    line("time.early", "Early leave minutes",
      "max(0, shift end - last end); 0 on pm or full leave",
      f.earlyLeaveMinutes, { ...base, lastEnd: str(last) }),
  ];
}

function overtimeLines(day: DayInput, f: Fields, ot: Overtime):
  TraceLine[] {
  const noShift = day.shift === null;
  return [
    line("time.overtime", "Overtime minutes", noShift
      ? "max(0, worked - daily normal limit)"
      : "max(0, worked - scheduled)", f.overtimeMinutes,
    { worked: String(f.workedMinutes),
      scheduled: String(f.scheduledMinutes), limit: str(ot.limit),
      ramadan: String(day.ramadan) }, ot.rules),
    line("time.overtimeNight", "Night overtime minutes", noShift
      ? "night-window minutes of the last overtime minutes worked"
      : "min(overtime, night-window minutes worked outside the shift)",
    f.overtimeNightMinutes, { overtime: String(f.overtimeMinutes),
      nightMinutes: String(ot.nightPool) }, ot.nightRules),
  ];
}

/** One line per minute field of the day sheet. */
export function daySheetTrace(day: DayInput, f: Fields, c: TraceCtx):
  TraceLine[] {
  const base = shiftInputs(day);
  const clocked = String(c.clocked);
  return [
    line("time.scheduled", "Scheduled minutes",
      "shift end - start - break; halved (floor) on a half day; 0 on" +
      " full leave, rest day, holiday or no shift",
      f.scheduledMinutes, base),
    line("time.worked", "Worked minutes",
      "max(0, clocked - assumed break) with a shift and no half day;" +
      " assumed break = rostered break minus unclocked gaps between" +
      " records inside the shift (convention); else clocked",
      f.workedMinutes, { ...base, clocked }),
    ...lateEarlyLines(day, f, c),
    ...overtimeLines(day, f, c.ot),
    line("time.restDayWork", "Rest-day work minutes",
      "worked on a rest day or holiday", f.restDayWorkMinutes,
      { kind: day.kind, worked: String(f.workedMinutes) }),
  ];
}
