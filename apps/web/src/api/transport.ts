import type { ApiMethod } from "./client";
import { ApiError } from "./errors";
import { CLIENT_ROUTES } from "./routes-map";

/** One call in wire terms: what goes into the URL, headers and body. */
export interface WireRequest {
  params?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Sends one call and returns the response body after it passed the
 * route's response schema. The mock and the HTTP adapter are both
 * transports, so the app decodes their answers with the same code.
 */
export type Transport = (m: ApiMethod, req: WireRequest) => Promise<unknown>;

type Issue = { path: PropertyKey[]; message: string };

export function issuePaths(issues: readonly Issue[]): string[] {
  return issues.map((i) => i.path.map(String).join(".") || "(root)");
}

/** A body that fails its schema is CONTRACT_MISMATCH, naming the path. */
export function parseResponse(m: ApiMethod, raw: unknown): unknown {
  const r = CLIENT_ROUTES[m].response.safeParse(raw);
  if (r.success) return r.data;
  const paths = issuePaths(r.error.issues);
  return failMismatch(m, paths);
}

function failMismatch(m: ApiMethod, paths: string[]): never {
  throw new ApiError("CONTRACT_MISMATCH",
    `${m} response does not match the contract at ${paths.join(", ")}`,
    { detail: { method: m, paths } });
}

/** Fills `{id}` style path parameters. */
export function fillPath(path: string, params: Record<string, string>) {
  return path.replace(/\{(\w+)\}/g, (_all, k: string) =>
    encodeURIComponent(params[k] ?? ""));
}

export function queryString(
  q: Record<string, string | number | undefined> | undefined,
): string {
  const pairs = Object.entries(q ?? {})
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=` +
      encodeURIComponent(String(v)));
  return pairs.length === 0 ? "" : `?${pairs.join("&")}`;
}
