import type {
  CompanyUpdate,
  InviteRequest,
  LoginRequest,
  LoginResponse,
} from "../contract";
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
const INVITE_MS = 72 * 3600 * 1000;

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

function inviteUser(c: Ctx, body: InviteRequest) {
  const taken = c.s.users.some((u) =>
    u.email.toLowerCase() === body.email.toLowerCase());
  if (taken) throw new MockFail("ALREADY_MEMBER", "already a member");
  record(c.s, signedIn(c), { at: c.now, action: "user.invited",
    entityType: "user", entityId: null,
    data: { email: body.email, role: body.role } });
  return { setupToken: `mock-invite-${c.s.audit.length}`,
    expiresAt: later(c.now, INVITE_MS) };
}

function mfaEnrol(c: Ctx) {
  const u = signedIn(c);
  if (u.mfaEnrolled) {
    throw new MockFail("MFA_ALREADY_ENROLLED", "already enrolled");
  }
  c.s.pendingMfa.add(u.id);
  const label = encodeURIComponent(`Demo:${u.email}`);
  return { secret: DEMO_SECRET, otpauthUrl: `otpauth://totp/${label}` +
    `?secret=${DEMO_SECRET}&issuer=Demo` };
}

function mfaConfirm(c: Ctx, body: { code: string }) {
  const u = signedIn(c);
  if (!c.s.pendingMfa.has(u.id)) {
    throw new MockFail("MFA_NOT_STARTED", "enrolment not started");
  }
  if (body.code !== DEMO_TOTP) {
    throw new MockFail("MFA_CODE_INVALID", "code is wrong");
  }
  c.s.pendingMfa.delete(u.id);
  u.mfaEnrolled = true;
  record(c.s, u, { at: c.now, action: "user.mfa-enrolled",
    entityType: "user", entityId: u.id, data: {} });
  return meOf(c);
}

export const AUTH_HANDLERS = {
  login: (c, r) => login(c, r.body as LoginRequest),
  logout: () => null,
  me: (c) => meOf(c),
  mfaEnrol: (c) => mfaEnrol(c),
  mfaConfirm: (c, r) => mfaConfirm(c, r.body as { code: string }),
  getCompany: (c) => c.s.company,
  updateCompany: (c, r) => updateCompany(c, r.body as CompanyUpdate),
  listUsers: (c) => ({ items: c.s.users.map((u) => ({ userId: u.id,
    email: u.email, displayName: u.displayName, role: u.role,
    employeeId: u.employeeId, mfaEnrolled: u.mfaEnrolled })) }),
  inviteUser: (c, r) => inviteUser(c, r.body as InviteRequest),
} satisfies Record<string, Handler>;
