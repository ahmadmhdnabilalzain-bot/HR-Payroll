import type { AppConfig } from "../config";
import type { ApiClient, AuthSource } from "./client";
import { createHttpApi } from "./http/http-client";
import { createMockApi } from "./mock/mock-client";
import type { MockOptions } from "./mock/options";

/** The one switch between the offline mock and the real API. */
export function createApi(
  cfg: AppConfig,
  auth: AuthSource,
  mock: MockOptions,
  clock: () => string,
): ApiClient {
  if (cfg.apiMode === "http") {
    return createHttpApi(cfg.apiBase, auth,
      (input, init) => fetch(input, init));
  }
  return createMockApi(mock, auth, clock);
}
