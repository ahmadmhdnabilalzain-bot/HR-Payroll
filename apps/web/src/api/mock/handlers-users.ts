import type { CompanyUser, InviteRequest, Role } from "../contract";
import { later, param, signedIn, type Ctx, type Handler } from "./context";
import { MockFail, notFound } from "./fail";
import type { MockUser } from "./seed-types";
import { newId, record } from "./state";

const INVITE_MS = 72 * 3600 * 1000;

const row = (u: MockUser): CompanyUser => ({ userId: u.id, email: u.email,
  displayName: u.displayName, role: u.role, employeeId: u.employeeId,
  mfaEnrolled: u.mfaEnrolled });

/** As the api: audit names the invite and the role, not the email. */
function inviteUser(c: Ctx, body: InviteRequest) {
  const taken = c.s.users.some((u) =>
    u.email.toLowerCase() === body.email.toLowerCase());
  if (taken) throw new MockFail("ALREADY_MEMBER", "already a member");
  const id = newId(c.s, "user");
  record(c.s, signedIn(c), { at: c.now, action: "user.invited",
    entityType: "invite", entityId: id, data: { role: body.role } });
  return { setupToken: `${c.s.company.id}.mock-invite-${id.slice(-6)}`,
    expiresAt: later(c.now, INVITE_MS) };
}

/** Owner with MFA (route table); the last owner cannot be demoted. */
function changeUserRole(c: Ctx, userId: string, to: Role): CompanyUser {
  const target = c.s.users.find((u) => u.id === userId);
  if (target === undefined) throw notFound("user");
  const owners = c.s.users.filter((u) => u.role === "owner").length;
  if (target.role === "owner" && to !== "owner" && owners <= 1) {
    throw new MockFail("LAST_OWNER", "the company needs an owner");
  }
  const from = target.role;
  target.role = to;
  record(c.s, signedIn(c), { at: c.now, action: "user.role-changed",
    entityType: "user", entityId: target.id, data: { from, to } });
  return row(target);
}

export const USER_HANDLERS = {
  listUsers: (c) => ({ items: c.s.users.map(row) }),
  inviteUser: (c, r) => inviteUser(c, r.body as InviteRequest),
  changeUserRole: (c, r) =>
    changeUserRole(c, param(r), (r.body as { role: Role }).role),
} satisfies Record<string, Handler>;
