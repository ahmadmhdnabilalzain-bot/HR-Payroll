/**
 * Words and small formatters of the Time screens (WP5). The catalogue
 * indexes are shared, so these live beside the screens, in English;
 * Arabic stays hidden until a native speaker has read it.
 * Never "approved", "compliant" or "certified" here.
 */

/** 90 minutes as "1 h 30 min"; none as a dash. */
export function hm(minutes: number): string {
  if (minutes <= 0) return "–";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h > 0 ? `${h} h` : "", m > 0 ? `${m} min` : ""]
    .filter((x) => x !== "").join(" ");
}

export const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

export const W = {
  area: {
    today: "Attendance today",
    register: "Attendance register",
    against: "Attendance against shifts",
    punches: "Clock-ins to match",
    overtime: "Overtime to decide",
    crew: "Crew overtime",
    roster: "Shifts and rosters",
    plan: "Roster planning",
    balances: "Leave balances",
  },
  outside: "This page is outside your view.",
  outsideHelp: "Time off is open to you.",
  back: "Time off",
  loading: "Loading time data",
  search: "Search",
  person: "Person",
  accept: "Accept",
  decline: "Decline",
  undo: "Undo",
  october: "October 2026",
} as const;
