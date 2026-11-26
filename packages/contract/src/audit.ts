import { z } from "zod";
import { Id, Timestamp } from "./primitives";

const Hash = z.string().regex(/^[0-9a-f]{64}$/);

const Scalar = z.union([z.string(), z.number(), z.boolean()]);

/**
 * Audit data: scalars, string lists, or one level of nested object of
 * scalars (e.g. `period: { year: 2026, month: 3 }`). Field names and
 * counts only, never salary amounts, IBANs or personal ids.
 */
export const AuditData = z.record(
  z.string(),
  z.union([Scalar, z.array(z.string()), z.record(z.string(), Scalar)]),
);
export type AuditData = z.infer<typeof AuditData>;

export const AuditEvent = z.object({
  id: Id,
  seq: z.number().int().min(1),
  at: Timestamp,
  actorUserId: Id.nullable(),
  /** `entity.verb` segments; hyphens join words ("pay-run.created"). */
  action: z.string().regex(/^[a-z]+(-[a-z]+)*(\.[a-z]+(-[a-z]+)*)+$/),
  entityType: z.string(),
  entityId: Id.nullable(),
  data: AuditData,
  prevHash: Hash,
  hash: Hash,
});
export type AuditEvent = z.infer<typeof AuditEvent>;

export const AuditVerifyResult = z.object({
  ok: z.boolean(),
  checked: z.number().int().min(0),
  firstBadSeq: z.number().int().nullable(),
});
export type AuditVerifyResult = z.infer<typeof AuditVerifyResult>;

/** Newest first; `before` is a `seq`. */
export const AuditEventQuery = z.object({
  before: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const AuditEventPage = z.object({
  items: z.array(AuditEvent),
  /** Pass as `before` for the next page; null on the last page. */
  nextBefore: z.number().int().nullable(),
});
export type AuditEventPage = z.infer<typeof AuditEventPage>;
