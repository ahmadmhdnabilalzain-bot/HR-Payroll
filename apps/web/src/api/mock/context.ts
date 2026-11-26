import type { Me, Role } from "../contract";
import type { WireRequest } from "../transport";
import { MockFail } from "./fail";
import type { MockUser } from "./seed-types";
import type { MockState } from "./state";

/** What a handler knows about the call it answers. */
export interface Ctx {
  s: MockState;
  now: string;
  today: string;
  /** Null only on public routes. */
  user: MockUser | null;
  mfa: boolean;
  expiresAt: string;
}

export type Handler = (c: Ctx, r: WireRequest) => unknown;

export const SESSION_MS = 8 * 3600 * 1000;

export function later(iso: string, ms: number): string {
  return new Date(Date.parse(iso) + ms).toISOString();
}

/** `mock:<userId>:<mfa>:<expiresAt>`; the timestamp has colons too. */
export function makeToken(userId: string, mfa: boolean, exp: string) {
  return `mock:${userId}:${String(mfa)}:${exp}`;
}

export function readToken(t: string | null) {
  const m = /^mock:([0-9a-f-]{36}):(true|false):(.+)$/.exec(t ?? "");
  if (m === null) return null;
  return { userId: m[1] ?? "", mfa: m[2] === "true", expiresAt: m[3] ?? "" };
}

export function signedIn(c: Ctx): MockUser {
  if (c.user === null) throw new MockFail("UNAUTHENTICATED", "no session");
  return c.user;
}

export const roleOf = (c: Ctx): Role => signedIn(c).role;

export function meOf(c: Ctx): Me {
  const u = signedIn(c);
  return {
    user: { id: u.id, email: u.email, displayName: u.displayName,
      mfaEnrolled: u.mfaEnrolled },
    memberships: [{ companyId: c.s.company.id,
      companyName: c.s.company.name, role: u.role,
      employeeId: u.employeeId }],
    session: { mfa: c.mfa, expiresAt: c.expiresAt },
  };
}

export const param = (r: WireRequest): string => r.params?.["id"] ?? "";
