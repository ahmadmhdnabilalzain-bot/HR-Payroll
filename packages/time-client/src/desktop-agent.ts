import type { ActivityMinute } from "@payroll/contract";

/**
 * What a desktop agent may do. The five capture capabilities are the
 * literal `false`: the owner ruled them out with no switch (LEDGER
 * 2026-11-25). An interface only; no agent is built yet.
 */
export interface AgentCapabilities {
  activeTime: boolean;
  categories: boolean;
  screenshots: false;
  keystrokes: false;
  pageContents: false;
  windowTitles: false;
  webAddresses: false;
}

export interface DesktopActivityAgent {
  platform: "macos" | "windows" | "linux";
  capabilities(): AgentCapabilities;
  start(ctx: { attendanceId: string; categoriesOn: boolean }): Promise<void>;
  stop(): Promise<void>;
  drain(): Promise<ActivityMinute[]>;
}

const FORBIDDEN = ["screenshots", "keystrokes", "pageContents",
  "windowTitles", "webAddresses"] as const;
const ALLOWED = new Set<string>(["activeTime", "categories", ...FORBIDDEN]);

function refuse(key: string): never {
  throw Object.assign(new Error(`forbidden capability: ${key}`),
    { code: "FORBIDDEN_CAPABILITY" });
}

/** Run at agent start-up: refuses to start on any forbidden capability. */
export function assertAgentCapabilities(c: unknown): AgentCapabilities {
  if (typeof c !== "object" || c === null) refuse("(not an object)");
  const o = c as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!ALLOWED.has(k)) refuse(k);
  for (const k of FORBIDDEN) if (o[k] !== false) refuse(k);
  for (const k of ["activeTime", "categories"]) {
    if (typeof o[k] !== "boolean") refuse(k);
  }
  return o as unknown as AgentCapabilities;
}
