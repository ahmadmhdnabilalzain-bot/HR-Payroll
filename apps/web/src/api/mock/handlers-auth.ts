import type { CompanyUpdate, LoginRequest, LoginResponse } from "../contract";
import {
  later,
  makeToken,
  meOf,
  SESSION_MS,
  signedIn,
  type Ctx,
  type Handler,
} from "./context";
import { MockFail } from "./fail";
import { DEMO_PASSWORD, DEMO_TOTP } from "./options";
import { record } from "./state";

const DEMO_SECRET = "JBSWY3DPEHPK3PXP";

const wrong = (): MockFail =>
  new MockFail("INVALID_CREDENTIALS", "email, password or code is wrong");

function login(c: Ctx, body: LoginRequest): LoginResponse {
  const u = c.s.users.find((x) =>
    x.email.toLowerCase() === body.email.toLowerCase());
  if (u === undefined || body.password !== DEMO_PASSWORD) throw wrong();
  const mfa = body.totp !== undefined;
  if (mfa && (!u.mfaEnrolled || body.totp !== DEMO_TOTP)) throw wrong();
  const expiresAt = later(c.now, SESSION_MS);
  const me = meOf({ ...c, user: u, mfa, expiresAt });
  return { token: makeToken(u.id, mfa, expiresAt), expiresAt,
    user: me.user, memberships: me.memberships };
}

function updateCompany(c: Ctx, body: CompanyUpdate) {
  const next = { ...c.s.company };
  if (body.name !== undefined) next.name = body.name;
  if (body.nameAr !== undefined) next.nameAr = body.nameAr;
  if (body.wps !== undefined) next.wps = body.wps;
  c.s.company = next;
  record(c.s, signedIn(c), { at: c.now, action: "company.updated",
    entityType: "company", entityId: next.id,
    data: { changed: Object.keys(body) } });
  return next;
}

/** The api re-checks the password before any MFA change. */
function reauthenticate(password: string): void {
  if (password !== DEMO_PASSWORD) throw wrong();
}

/**
 * MFA enrolment goes to the api's security log, not the audit chain,
 * so the mock appends no audit event for it.
 */
function mfaEnrol(c: Ctx, body: { password: string }) {
  const u = signedIn(c);
  if (u.mfaEnrolled) {
    throw new MockFail("MFA_ALREADY_ENROLLED", "already enrolled");
  }
  reauthenticate(body.password);
  c.s.pendingMfa.add(u.id);
  const label = encodeURIComponent(`Demo:${u.email}`);
  return { secret: DEMO_SECRET, otpauthUrl: `otpauth://totp/${label}` +
    `?secret=${DEMO_SECRET}&issuer=Demo&algorithm=SHA1&digits=6` +
    "&period=30" };
}

/** Does not upgrade this session: sign in with a code for that. */
function mfaConfirm(c: Ctx, body: { code: string; password: string }) {
  const u = signedIn(c);
  reauthenticate(body.password);
  if (u.mfaEnrolled) {
    throw new MockFail("MFA_ALREADY_ENROLLED", "already enrolled");
  }
  if (!c.s.pendingMfa.has(u.id)) {
    throw new MockFail("MFA_NOT_STARTED", "enrolment not started");
  }
  if (body.code !== DEMO_TOTP) {
    throw new MockFail("MFA_CODE_INVALID", "code is wrong");
  }
  c.s.pendingMfa.delete(u.id);
  u.mfaEnrolled = true;
  return meOf(c);
}

type MfaBody = { code: string; password: string };

export const AUTH_HANDLERS = {
  login: (c, r) => login(c, r.body as LoginRequest),
  logout: () => null,
  me: (c) => meOf(c),
  mfaEnrol: (c, r) => mfaEnrol(c, r.body as MfaBody),
  mfaConfirm: (c, r) => mfaConfirm(c, r.body as MfaBody),
  getCompany: (c) => c.s.company,
  updateCompany: (c, r) => updateCompany(c, r.body as CompanyUpdate),
} satisfies Record<string, Handler>;
