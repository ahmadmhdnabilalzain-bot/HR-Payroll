import { z } from "zod";
import { Settlement } from "./payroll";
import { Id, IsoDate, Lang, listOf, Timestamp } from "./primitives";
import { Role } from "./roles";
import { TraceLine } from "./trace";

/** The engine's seven exit kinds (literal copy; a test compares). */
export const ExitKind = z.enum(["resignation", "termination",
  "summary-dismissal", "worker-exit-without-notice",
  "probation-employer-termination", "probation-leave-state",
  "probation-new-employer"]);
export type ExitKind = z.infer<typeof ExitKind>;

export const ExitStatus = z.enum(["requested", "in-notice", "rejected",
  "withdrawn", "closed"]);
export type ExitStatus = z.infer<typeof ExitStatus>;

/** Kinds a worker may start for themselves (Ruling 30). */
export const SELF_SERVICE_KINDS: readonly ExitKind[] = ["resignation",
  "probation-leave-state", "probation-new-employer"];

export const NoticeFlag = z.enum(["reduced-by-agreement",
  "counsel-review", "job-search-day"]);
export type NoticeFlag = z.infer<typeof NoticeFlag>;

/** What each engine notice flag means, shown next to the exit. */
export const NOTICE_FLAG_TEXT: Readonly<Record<NoticeFlag, string>> = {
  "reduced-by-agreement": "Notice reduced by agreement (Decree-Law 33 " +
    "of 2021, Article 43(2)). The worker's rights must be kept.",
  "counsel-review": "Exit without notice: the grounds and procedure in " +
    "Articles 44 and 45 are not modelled. Check with counsel.",
  "job-search-day": "After notice from the employer, the worker may " +
    "take one unpaid working day a week to look for work, with notice " +
    "(Article 43(5)).",
};

/** Never computed and never deducted (master feature list default). */
export const EXIT_FLAG_ONLY = ["loan balances", "air ticket entitlement",
  "training-bond balance", "open expense claims", "company card balance",
  "deductions from final pay"] as const;
export const EXIT_FLAG_ONLY_NOTE = "Not computed and never deducted " +
  "automatically. Check and settle these by hand.";

export const ExitCreate = z.object({
  employeeId: Id.optional(),
  kind: ExitKind,
  noticeGivenDate: IsoDate,
  agreedNoticeDays: z.number().int().min(0).optional(),
  reason: z.string().max(2000).optional(),
});
export type ExitCreate = z.infer<typeof ExitCreate>;

/** HR-entered at settlement time (Ruling 12). */
/** Upper bounds (3650 days) are product bounds, not law. */
export const SettlementInputs = z.object({
  unusedLeaveDays: z.number().int().min(0).max(3650),
  serviceUnpaidLeaveDays: z.number().int().min(0).max(3650),
});
export type SettlementInputs = z.infer<typeof SettlementInputs>;

export const ExitSettlement = z.object({
  /** Exactly as the engine's calculateSettlement returned it. */
  settlement: Settlement,
  flagOnly: z.array(z.string()),
  flagOnlyNote: z.string(),
  inputs: SettlementInputs.extend({ salaryVersion: z.number().int() }),
  dueDate: IsoDate,
  dueTrace: TraceLine,
  version: z.number().int().min(1),
  computedAt: Timestamp,
});
export type ExitSettlement = z.infer<typeof ExitSettlement>;

export const DocumentKind = z.enum(["experience-certificate",
  "settlement-statement"]);
export type DocumentKind = z.infer<typeof DocumentKind>;

export const ExitDocument = z.object({
  kind: DocumentKind,
  status: z.enum(["generated", "not-configured", "failed"]),
  documentRef: z.string().nullable(),
  at: Timestamp,
});

/** Ids only go to the document port; it reads what it needs later. */
export const DocumentsRequest = z.object({
  kinds: z.array(DocumentKind).min(1).max(2),
  lang: Lang,
});
export type DocumentsRequest = z.infer<typeof DocumentsRequest>;

/** A login that may belong to the leaver (Plan 8 review C-1). */
export const LeaverLogin = z.object({
  userId: Id,
  role: Role,
  match: z.enum(["linked", "email"]),
  active: z.boolean(),
  /** HR confirmed this login belongs to someone else. */
  confirmedOther: z.boolean(),
});
export type LeaverLogin = z.infer<typeof LeaverLogin>;

/**
 * Revokes every active login the server lists in `access.logins`,
 * except those HR confirms belong to someone else.
 */
export const RevokeRequest = z.object({
  notTheLeaver: z.array(Id).max(20).optional(),
});
export type RevokeRequest = z.infer<typeof RevokeRequest>;

/** Owner links (or unlinks) a member's login to an employee record. */
export const UserEmployeeLink = z.object({ employeeId: Id.nullable() });
export type UserEmployeeLink = z.infer<typeof UserEmployeeLink>;

/** In-app membership revoke plus the external port (Ruling 19). */
export const AccessResult = z.object({
  inApp: z.enum(["revoked", "no-login"]),
  external: z.enum(["revoked", "not-configured", "failed"]),
  /** Revoked before the last working date (Dubai). */
  beforeLastDay: z.boolean(),
  at: Timestamp,
});
export type AccessResult = z.infer<typeof AccessResult>;

export const Exit = z.object({
  id: Id,
  employeeId: Id,
  employeeName: z.string(),
  kind: ExitKind,
  status: ExitStatus,
  noticeGivenDate: IsoDate,
  noticeDays: z.number().int().min(0),
  lastWorkingDate: IsoDate,
  settlementDueDate: IsoDate,
  inProbation: z.boolean(),
  flags: z.array(z.object({ code: NoticeFlag, text: z.string() })),
  noticeTrace: z.array(TraceLine),
  /** `null`: not visible to you (owner, hr and the leaver only). */
  reason: z.string().nullable(),
  requestedBy: Id,
  decidedBy: Id.nullable(),
  decidedAt: Timestamp.nullable(),
  /** `null`: not computed yet, or not visible to you. */
  settlement: ExitSettlement.nullable(),
  access: z.object({
    status: z.enum(["not-revoked", "revoked", "no-login"]),
    at: Timestamp.nullable(),
    /**
     * Logins that may be the leaver's: linked to the employee record,
     * or with the employee's email. Owner and hr only (else empty).
     */
    logins: z.array(LeaverLogin),
  }),
  documents: z.array(ExitDocument),
  closedAt: Timestamp.nullable(),
  createdAt: Timestamp,
});
export type Exit = z.infer<typeof Exit>;

export const ExitQuery = z.object({
  employeeId: Id.optional(),
  status: ExitStatus.optional(),
});

export const ExitList = listOf(Exit);
