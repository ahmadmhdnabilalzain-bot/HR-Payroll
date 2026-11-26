export type ApiMode = "mock" | "http";

export interface AppConfig {
  apiMode: ApiMode;
  /** Base URL of the HTTP API, e.g. "" (same origin) or "/api". */
  apiBase: string;
}

/** Reads the Vite env once; an unknown mode fails loudly. */
export function readConfig(
  env: Record<string, string | undefined>,
): AppConfig {
  const mode = env["VITE_API_MODE"] ?? "mock";
  if (mode !== "mock" && mode !== "http") {
    throw new Error(`CONFIG_API_MODE: unknown VITE_API_MODE "${mode}"`);
  }
  return { apiMode: mode, apiBase: env["VITE_API_BASE"] ?? "" };
}
