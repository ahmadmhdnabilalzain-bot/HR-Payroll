import { indicatorFor } from "./indicator";
import type { Clock, Indicator, LocationSource, TrackingApi } from "./ports";

export type TickResult = "sampled" | "not-due" | "not-tracking" |
  "no-source" | "not-collected" | "location-error";

/**
 * Called once a minute by the app. Every tick shows the indicator
 * before anything else; a reading is taken only while tracking, when
 * location is collected and the server says one is due (the server's
 * `nextLocationDueAt` is the truth: once an hour).
 */
export function createHourlySampler(d: { api: TrackingApi;
  source: LocationSource | null; indicator: Indicator; clock: Clock }) {
  async function tick(): Promise<TickResult> {
    const st = await d.api.status();
    const kind = d.source?.kind ?? null;
    d.indicator.show(indicatorFor(st, kind));
    if (st.state !== "tracking" || st.attendanceId === null) {
      return "not-tracking";
    }
    if (!st.collects.locationHourly) return "not-collected";
    if (d.source === null) return "no-source";
    const now = d.clock.now();
    if (st.nextLocationDueAt !== null &&
      now.getTime() < Date.parse(st.nextLocationDueAt)) return "not-due";
    try {
      const r = await d.source.current();
      await d.api.postLocation({ attendanceId: st.attendanceId,
        at: now.toISOString(), lat: r.lat, lng: r.lng,
        accuracyM: Math.round(r.accuracyM), source: d.source.kind,
        indicatorShown: true });
      return "sampled";
    } catch {
      d.indicator.show(indicatorFor(st, kind, "location-error"));
      return "location-error";
    }
  }
  return { tick };
}
