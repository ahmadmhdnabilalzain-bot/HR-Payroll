import type { ActivityMinute } from "@payroll/contract";
import type { Clock } from "./ports";

const MIN = 60_000;

/**
 * One yes-or-no per minute. `noteInput()` takes no argument: it only
 * marks the current minute active (no key, count, target or text is
 * accepted or kept). A browser cannot see other apps, so `category`
 * is always null here.
 */
export function createActivityMeter(clock: Clock, start: Date) {
  const active = new Set<number>();
  let from = Math.floor(start.getTime() / MIN);
  function noteInput(): void {
    active.add(Math.floor(clock.now().getTime() / MIN));
  }
  function drain(): ActivityMinute[] {
    const until = Math.floor(clock.now().getTime() / MIN);
    const out: ActivityMinute[] = [];
    for (let m = from; m < until; m++) {
      out.push({ at: new Date(m * MIN).toISOString(), active: active.has(m),
        category: null });
      active.delete(m);
    }
    from = Math.max(from, until);
    return out;
  }
  return { noteInput, drain };
}
