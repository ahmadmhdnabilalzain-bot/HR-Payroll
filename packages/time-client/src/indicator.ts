import type { WfhState, WfhStatus } from "@payroll/contract";

/** The always-visible tracking indicator, as data for any screen. */
export interface IndicatorView {
  visible: boolean;
  state: WfhState | "location-error";
  tone: "active" | "paused" | "warning" | "off";
  textEn: string;
  textAr: null;
  lines: string[];
}

const VISIBLE = new Set(["tracking", "paused", "stopped-limit",
  "location-error"]);

function trackingText(s: WfhStatus): string {
  const parts = ["active time"];
  if (s.collects.categories) parts.push("app categories");
  if (s.collects.locationHourly) parts.push("location once an hour");
  return `Tracking on: ${parts.join(", ")}`;
}

function textOf(state: IndicatorView["state"], s: WfhStatus): string {
  if (state === "tracking") return trackingText(s);
  if (state === "paused") return "Tracking paused";
  if (state === "stopped-limit") return "Clock-out missing: tracking stopped";
  if (state === "location-error") return "Location could not be read";
  return "Tracking off";
}

const TONE: Record<string, IndicatorView["tone"]> = { tracking: "active",
  paused: "paused", "stopped-limit": "warning", "location-error":
  "warning" };

/** Arabic stays null until a native speaker reviews the wording. */
export function indicatorFor(status: WfhStatus, source: "phone" |
  "browser" | null, state: IndicatorView["state"] = status.state)
  : IndicatorView {
  const lines: string[] = [];
  if (state === "tracking" && source === "browser" &&
    status.collects.locationHourly) {
    lines.push("Location only while this page is open");
  }
  return { visible: VISIBLE.has(state), state, tone: TONE[state] ?? "off",
    textEn: textOf(state, status), textAr: null, lines };
}
