import { memoryAuth } from "../../src/api/auth-memory";
import { createMockApi } from "../../src/api/mock/mock-client";
import {
  DEMO_PASSWORD,
  type MockOptions,
} from "../../src/api/mock/options";

export const TODAY = "2026-11-26";
export const NOW = "2026-11-26T06:00:00.000Z";

/** A mock API at latency 0 with a clock the test moves. */
export function mockApi(over: Partial<MockOptions> = {}) {
  let now = NOW;
  const auth = memoryAuth();
  const options: MockOptions = {
    today: TODAY,
    latencyMs: 0,
    seed: "demo",
    failures: new Set(),
    signInAs: null,
    ...over,
  };
  const api = createMockApi(options, auth, () => now);
  const signIn = async (email: string, totp?: string) => {
    const r = await api.login({
      email,
      password: DEMO_PASSWORD,
      ...(totp === undefined ? {} : { totp }),
    });
    auth.set(r.token, r.memberships[0]?.companyId ?? null);
    return r;
  };
  const setNow = (iso: string): void => {
    now = iso;
  };
  return { api, auth, signIn, setNow };
}

/** Expect a promise to reject with an ApiError of this code. */
export async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return (e as { code?: string }).code ?? "NO_CODE";
  }
  return "RESOLVED";
}
