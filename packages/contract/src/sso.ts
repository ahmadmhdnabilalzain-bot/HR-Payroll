import { z } from "zod";
import { ProviderState } from "./channel-settings";
import { Id, listOf, Timestamp } from "./primitives";

export const SsoProviderEnum = z.enum(["google", "microsoft"]);
export const SsoProviderParams = z.object({ provider: SsoProviderEnum });

export const SsoStartRequest = z.object({
  intent: z.enum(["login", "invite"]),
  inviteToken: z.string().min(1).max(200).optional(),
}).refine((b) => b.intent !== "invite" || b.inviteToken !== undefined,
  { path: ["inviteToken"], message: "an invitation needs its token" });
export type SsoStartRequest = z.infer<typeof SsoStartRequest>;

export const SsoStartResponse = z.object({
  authorizeUrl: z.string(),
  expiresAt: Timestamp,
});

export const SsoCallbackRequest = z.object({
  code: z.string().min(1).max(2048),
  state: z.string().min(1).max(200),
  totp: z.string().regex(/^\d{6}$/).optional(),
});
export type SsoCallbackRequest = z.infer<typeof SsoCallbackRequest>;

export const SsoIdentity = z.object({
  id: Id,
  provider: SsoProviderEnum,
  email: z.string().nullable(),
  linkedAt: Timestamp,
  lastUsedAt: Timestamp.nullable(),
});
export const SsoIdentityList = listOf(SsoIdentity);

const Domain = z.string().max(253).regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/);

export const SsoSettingsBody = z.object({
  allowedDomains: z.array(Domain).max(20),
  googleHostedDomains: z.array(Domain).max(20),
  microsoftTenantIds: z.array(Id).max(20),
  jitEmployees: z.boolean(),
  enforceSso: z.boolean(),
});
export type SsoSettingsBody = z.infer<typeof SsoSettingsBody>;

const enforceNeeds = (b: SsoSettingsBody) => !b.enforceSso ||
  b.googleHostedDomains.length > 0 || b.microsoftTenantIds.length > 0;

const jitNeeds = (b: SsoSettingsBody) => !b.jitEmployees ||
  (b.allowedDomains.length > 0 && (b.googleHostedDomains.length > 0 ||
    b.microsoftTenantIds.length > 0));

export const SSO_NOTE = "Sign-in with Google or Microsoft does not " +
  "replace the authenticator code needed for payroll approvals. Owners " +
  "can always sign in with a password.";

/**
 * Review I4: a domain is used for JIT and enforcement only once the
 * company proved it owns it with a DNS TXT record
 * (`txtName` holding `txtValue`); one company per verified domain.
 */
export const SsoDomain = z.object({
  domain: Domain,
  status: z.enum(["pending", "verified"]),
  txtName: z.string(),
  txtValue: z.string(),
  verifiedAt: Timestamp.nullable(),
});
export const SsoDomainRequest = z.object({ domain: Domain });
export type SsoDomainRequest = z.infer<typeof SsoDomainRequest>;

export const SsoSettings = SsoSettingsBody.extend({
  version: z.number().int().min(0),
  domains: z.array(SsoDomain),
  providers: z.object({ google: ProviderState, microsoft: ProviderState }),
  note: z.literal(SSO_NOTE),
});
export type SsoSettings = z.infer<typeof SsoSettings>;

export const SsoSettingsUpdate = SsoSettingsBody.extend({
  expectedVersion: z.number().int().min(0),
}).refine(jitNeeds, { path: ["jitEmployees"], message: "just-in-time " +
  "accounts need an allowed domain and a hosted domain or tenant" })
  .refine(enforceNeeds, { path: ["enforceSso"], message: "enforcing " +
    "single sign-on needs a hosted domain or tenant" });
export type SsoSettingsUpdate = z.infer<typeof SsoSettingsUpdate>;
