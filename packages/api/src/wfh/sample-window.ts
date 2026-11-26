import { MAX_CLOCK_SKEW_MINUTES, MAX_LATE_UPLOAD_HOURS } from "./limits";

/** Everything a sample time is checked against. Pure. */
export interface SampleWindow {
  clockIn: string;
  clockOut: string | null;
  boundMinutes: number;
  consentAt: string;
  pauses: { start: string; end: string | null }[];
  now: string;
}

const ms = (t: string) => Date.parse(t);
const MIN = 60_000;

/**
 * "outside": before clock-in, at or after clock-out, at or after the
 * tracked-hours bound, before consent, in the future beyond the clock
 * skew, or older than the late-upload limit. "paused": inside a pause
 * (start inclusive, end exclusive; an open pause never ends).
 */
export function checkSampleTime(at: string, w: SampleWindow)
  : "ok" | "outside" | "paused" {
  const t = ms(at);
  const outside = t < ms(w.clockIn) ||
    (w.clockOut !== null && t >= ms(w.clockOut)) ||
    t >= ms(w.clockIn) + w.boundMinutes * MIN ||
    t < ms(w.consentAt) ||
    t > ms(w.now) + MAX_CLOCK_SKEW_MINUTES * MIN ||
    t < ms(w.now) - MAX_LATE_UPLOAD_HOURS * 60 * MIN;
  if (outside) return "outside";
  const paused = w.pauses.some((p) => ms(p.start) <= t &&
    (p.end === null || t < ms(p.end)));
  return paused ? "paused" : "ok";
}
