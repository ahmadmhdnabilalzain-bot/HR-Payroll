import type { ApiMethod } from "../client";
import { API_METHODS } from "../routes-map";
import type { MockSeed } from "./seed-types";

export type SeedName = "demo" | "empty" | "large";

export interface MockOptions {
  /** Today in Dubai, `YYYY-MM-DD`; the seed is built around it. */
  today: string;
  latencyMs: number;
  seed: SeedName;
  failures: ReadonlySet<ApiMethod>;
  /** Signs this email in with `mfa: true` (Playwright). */
  signInAs: string | null;
  /** Tests only: change the seed before the mock starts. */
  seedPatch?: (s: MockSeed) => MockSeed;
}

/** Every demo account uses this password; the TOTP code is 123456. */
export const DEMO_PASSWORD = "demo-password";
export const DEMO_TOTP = "123456";
export const DEFAULT_LATENCY_MS = 250;

const SEEDS: readonly SeedName[] = ["demo", "empty", "large"];

function latency(v: string | null): number {
  const n = v === null ? Number.NaN : Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 10000 ? n
    : DEFAULT_LATENCY_MS;
}

/**
 * `?mock-fail=listEmployees,getCompany`, `?mock-seed=empty|large`,
 * `?mock-latency=0`, `?mock-as=hr@demo.test`. Unknown values are
 * ignored, so a typo gives the normal demo.
 */
export function mockOptionsFromUrl(
  search: string,
  today: string,
): MockOptions {
  const q = new URLSearchParams(search);
  const known = new Set<string>(API_METHODS);
  const failures = (q.get("mock-fail") ?? "").split(",")
    .filter((m): m is ApiMethod => known.has(m));
  const seed = q.get("mock-seed");
  return {
    today,
    latencyMs: latency(q.get("mock-latency")),
    seed: SEEDS.find((s) => s === seed) ?? "demo",
    failures: new Set(failures),
    signInAs: q.get("mock-as"),
  };
}
