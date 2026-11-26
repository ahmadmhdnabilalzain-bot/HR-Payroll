import { buildClient } from "../build-client";
import type { ApiClient, ApiMethod, AuthSource } from "../client";
import { ApiError, errorBody, errorFromBody } from "../errors";
import { parseResponse, type WireRequest } from "../transport";
import type { Ctx, Handler } from "./context";
import { MockFail } from "./fail";
import { authorise, validateRequest } from "./guard";
import { AUDIT_HANDLERS } from "./handlers-audit";
import { AUTH_HANDLERS } from "./handlers-auth";
import { LEAVE_HANDLERS } from "./handlers-leave";
import { PAYROLL_HANDLERS } from "./handlers-payroll";
import { PEOPLE_HANDLERS } from "./handlers-people";
import { SIF_HANDLERS } from "./handlers-sif";
import { USER_HANDLERS } from "./handlers-users";
import type { MockOptions } from "./options";
import { createState, type MockState } from "./state";

const HANDLERS: Record<ApiMethod, Handler> = {
  ...AUTH_HANDLERS,
  ...USER_HANDLERS,
  ...PEOPLE_HANDLERS,
  ...LEAVE_HANDLERS,
  ...PAYROLL_HANDLERS,
  ...SIF_HANDLERS,
  ...AUDIT_HANDLERS,
};

const wait = (ms: number): Promise<void> => ms <= 0 ? Promise.resolve()
  : new Promise((done) => setTimeout(done, ms));

function answer(
  m: ApiMethod, req: WireRequest, base: Ctx, auth: AuthSource,
  o: MockOptions,
): unknown {
  const c = authorise(m, base, auth, o);
  const valid = validateRequest(m, req);
  return parseResponse(m, HANDLERS[m](c, valid));
}

/**
 * The offline API. It follows Plan 3's routes, roles, MFA rules and
 * error codes; every answer passes the contract's response schema and
 * every refusal is a contract error body, decoded like the server's.
 */
export function createMockApi(
  o: MockOptions,
  auth: AuthSource,
  clock: () => string,
): ApiClient {
  const s: MockState = createState(o);
  let calls = 0;
  return buildClient(async (m, req) => {
    await wait(o.latencyMs);
    calls += 1;
    if (o.failures.has(m)) {
      throw new ApiError("NETWORK", `injected failure: ${m}`, {});
    }
    const now = clock();
    const base: Ctx = { s, now, today: o.today, user: null,
      mfa: false, expiresAt: now };
    try {
      return answer(m, req, base, auth, o);
    } catch (e) {
      if (!(e instanceof MockFail)) throw e;
      const err = errorBody(e.code, e.message, `mock-${calls}`, e.detail);
      throw errorFromBody(err.status, err.body);
    }
  });
}
