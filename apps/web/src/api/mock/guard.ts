import type { ApiMethod, AuthSource } from "../client";
import { CLIENT_ROUTES } from "../routes-map";
import { issuePaths, type WireRequest } from "../transport";
import {
  later,
  readToken,
  SESSION_MS,
  type Ctx,
} from "./context";
import { MockFail } from "./fail";
import type { MockOptions } from "./options";
import type { MockUser } from "./seed-types";
import type { MockState } from "./state";

type Part = "params" | "query" | "body" | "headers";
const PARTS: readonly Part[] = ["params", "query", "body", "headers"];

/** Each request part through its route schema, as the server would. */
export function validateRequest(m: ApiMethod, req: WireRequest) {
  const route = CLIENT_ROUTES[m];
  const out: WireRequest = {};
  for (const part of PARTS) {
    const schema = route[part];
    if (schema === undefined) continue;
    const r = schema.safeParse(req[part] ?? (part === "body" ? undefined
      : {}));
    if (!r.success) {
      throw new MockFail("VALIDATION_FAILED", `invalid ${part}`,
        { paths: issuePaths(r.error.issues).map((p) => `${part}.${p}`) });
    }
    (out as Record<Part, unknown>)[part] = r.data;
  }
  return out;
}

interface Session {
  user: MockUser;
  mfa: boolean;
  expiresAt: string;
}

function session(
  s: MockState, auth: AuthSource, now: string, o: MockOptions,
): Session | null {
  const t = readToken(auth.token());
  if (t !== null) {
    const user = s.users.find((u) => u.id === t.userId);
    if (user === undefined || now >= t.expiresAt) return null;
    return { user, mfa: t.mfa, expiresAt: t.expiresAt };
  }
  const as = s.users.find((u) => u.email === o.signInAs);
  return as === undefined ? null
    : { user: as, mfa: true, expiresAt: later(now, SESSION_MS) };
}

function checkTenant(
  m: ApiMethod, c: Ctx, auth: AuthSource, implicit: boolean,
): void {
  const route = CLIENT_ROUTES[m];
  const company = auth.companyId();
  if (company === null && !implicit) {
    throw new MockFail("COMPANY_HEADER_REQUIRED", "no company chosen");
  }
  if (company !== null && company !== c.s.company.id) {
    throw new MockFail("TENANT_FORBIDDEN", "not a member");
  }
  const user = c.user as MockUser;
  if (!route.roles.includes(user.role)) {
    throw new MockFail("FORBIDDEN", `${user.role} cannot call ${m}`);
  }
}

function checkMfa(m: ApiMethod, c: Ctx): void {
  if (!CLIENT_ROUTES[m].mfa) return;
  if (!(c.user as MockUser).mfaEnrolled) {
    throw new MockFail("MFA_ENROLMENT_REQUIRED", "add an authenticator");
  }
  if (!c.mfa) throw new MockFail("MFA_REQUIRED", "sign in with a code");
}

/** Plan 3's order: session, company, role, then MFA. */
export function authorise(
  m: ApiMethod, base: Ctx, auth: AuthSource, o: MockOptions,
): Ctx {
  const route = CLIENT_ROUTES[m];
  if (route.auth === "public") return base;
  const ses = session(base.s, auth, base.now, o);
  if (ses === null) throw new MockFail("UNAUTHENTICATED", "no session");
  const c: Ctx = { ...base, user: ses.user, mfa: ses.mfa,
    expiresAt: ses.expiresAt };
  if (route.auth === "tenant") {
    checkTenant(m, c, auth, auth.token() === null);
    checkMfa(m, c);
  }
  return c;
}
