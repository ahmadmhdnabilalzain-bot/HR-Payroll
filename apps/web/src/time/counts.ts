import { peekTime } from "../demo/data/time-load";
import { visibleIds } from "../demo/time-off";
import type { NavCtx } from "../nav/types";
import { phaseOf } from "./decisions";
import { needsLook, todayRows } from "./Today";

/**
 * Things waiting, for the panel counts (navigation map, section 2).
 * Null until the Time data chunk has arrived, so a count never lies.
 */
export const attendanceLook = (c: NavCtx): number | null => {
  const t = peekTime();
  return t === null ? null : todayRows(t,
    new Set(visibleIds(c.data, c.state))).filter(needsLook).length;
};

export const claimsWaiting = (c: NavCtx): number | null => {
  const t = peekTime();
  const ids = new Set(visibleIds(c.data, c.state));
  return t === null ? null : t.claims.filter((x) => ids.has(x.employeeId) &&
    phaseOf(x, c.state) === "waiting").length;
};

export const crewWaiting = (c: NavCtx): number | null => {
  const t = peekTime();
  return t === null ? null : t.crew.filter((x) =>
    c.state.timeDecided[x.id] === undefined).length;
};

export const punchesToMatch = (c: NavCtx): number | null => {
  const t = peekTime();
  return t === null ? null : t.unmatched.filter((x) =>
    c.state.punchMatched[x.id] === undefined).length;
};

export const draftWeeks = (c: NavCtx): number | null => {
  const t = peekTime();
  if (t === null) return null;
  const d = t.rosterDays;
  return [0, 7].filter((i) => d[i]?.status === "draft" &&
    c.state.timeDecided[`roster-${d[i]?.iso ?? ""}`] === undefined).length;
};
