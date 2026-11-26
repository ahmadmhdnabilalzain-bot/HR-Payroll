import { ERROR_CODES } from "@payroll/contract";

/**
 * Plan 13 audit keys: enums, ids and counts only. Never a phone
 * number, address, token, URL, secret or message text (channelAudit
 * also refuses those key names at any depth).
 */
type Check = (v: unknown) => boolean;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isInt = (v: unknown) => Number.isSafeInteger(v);
const oneOf = (values: readonly string[]): Check => (v) =>
  typeof v === "string" && values.includes(v);
const listOf = (values: readonly string[]): Check => (v) =>
  Array.isArray(v) && v.every(oneOf(values));

export const CHANNEL_AUDIT_CHECKS: Record<string, Check> = {
  consentVersion: isInt,
  via: oneOf(["app", "whatsapp-stop", "replaced"]),
  errorCode: oneOf(ERROR_CODES),
  decision: oneOf(["approve", "reject"]),
  approvalId: (v) => typeof v === "string" && UUID_RE.test(v),
  attachmentCount: isInt,
  keptCount: isInt,
  receiptCount: isInt,
  flags: listOf(["SENDER_UNVERIFIED", "ATTACHMENT_SKIPPED"]),
  as: oneOf(["receipt", "claim-draft"]),
  dismissReason: oneOf(["spam", "duplicate", "not-relevant", "other"]),
  scope: oneOf(["my", "team", "company-deadlines"]),
  provider: oneOf(["google", "microsoft"]),
};
