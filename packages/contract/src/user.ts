import { z } from "zod";
import { Email, Id, Name, Timestamp } from "./primitives";
import { Role } from "./roles";

export const User = z.object({
  id: Id,
  email: Email,
  displayName: Name,
  mfaEnrolled: z.boolean(),
});
export type User = z.infer<typeof User>;

export const Membership = z.object({
  companyId: Id,
  companyName: Name,
  role: Role,
  employeeId: Id.nullable(),
});
export type Membership = z.infer<typeof Membership>;

export const LoginRequest = z.object({
  email: Email,
  password: z.string().min(1).max(200),
  totp: z.string().regex(/^\d{6}$/).optional(),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const LoginResponse = z.object({
  token: z.string(),
  expiresAt: Timestamp,
  user: User,
  memberships: z.array(Membership),
});
export type LoginResponse = z.infer<typeof LoginResponse>;

export const Me = z.object({
  user: User,
  memberships: z.array(Membership),
  session: z.object({ mfa: z.boolean(), expiresAt: Timestamp }),
});
export type Me = z.infer<typeof Me>;

export const InviteRequest = z.object({
  email: Email,
  role: Role,
  employeeId: Id.optional(),
});
export type InviteRequest = z.infer<typeof InviteRequest>;

export const InviteResponse = z.object({
  setupToken: z.string(),
  expiresAt: Timestamp,
});
export type InviteResponse = z.infer<typeof InviteResponse>;

export const AcceptInviteRequest = z.object({
  setupToken: z.string().min(1).max(200),
  password: z.string().min(12).max(200),
  displayName: Name,
});
export type AcceptInviteRequest = z.infer<typeof AcceptInviteRequest>;

export const MfaEnrolResponse = z.object({
  secret: z.string(),
  otpauthUrl: z.string(),
});
export type MfaEnrolResponse = z.infer<typeof MfaEnrolResponse>;

/** Enrolment needs the current password (a stolen token is not enough). */
export const MfaEnrolRequest = z.object({
  password: z.string().min(1).max(200),
});
export type MfaEnrolRequest = z.infer<typeof MfaEnrolRequest>;

/**
 * Confirming needs the password too. It does not make the current
 * session an MFA session: sign in again with a code for that.
 */
export const MfaConfirmRequest = z.object({
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(1).max(200),
});
export type MfaConfirmRequest = z.infer<typeof MfaConfirmRequest>;

/** `PATCH /v1/users/{id}` (id is the user id): owner only, MFA. */
export const RoleChange = z.object({ role: Role });
export type RoleChange = z.infer<typeof RoleChange>;

/** A member of the company, as `GET /v1/users` lists it. */
export const CompanyUser = z.object({
  userId: Id,
  email: Email,
  displayName: Name,
  role: Role,
  employeeId: Id.nullable(),
  mfaEnrolled: z.boolean(),
});
export type CompanyUser = z.infer<typeof CompanyUser>;
