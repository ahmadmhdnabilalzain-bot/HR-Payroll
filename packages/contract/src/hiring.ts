import { z } from "zod";
import { Email, Id, listOf, Name, Timestamp } from "./primitives";

/** Shared by requisitions, offers and exits (one approval rule). */
export const Decision = z.object({
  approve: z.boolean(),
  note: z.string().max(1000).optional(),
});
export type Decision = z.infer<typeof Decision>;

export const RequisitionStatus = z.enum(["pending-approval", "open",
  "rejected", "filled", "cancelled"]);
export type RequisitionStatus = z.infer<typeof RequisitionStatus>;

/** Headcount 1 to 50 is a product bound, not law (Ruling 31). */
export const RequisitionCreate = z.object({
  title: Name,
  titleAr: z.string().max(200).optional(),
  departmentId: Id.optional(),
  hiringManagerUserId: Id.optional(),
  headcount: z.number().int().min(1).max(50),
  reason: z.string().max(2000).optional(),
});
export type RequisitionCreate = z.infer<typeof RequisitionCreate>;

export const Requisition = z.object({
  id: Id,
  title: z.string(),
  titleAr: z.string().nullable(),
  departmentId: Id.nullable(),
  hiringManagerUserId: Id.nullable(),
  headcount: z.number().int(),
  hiredCount: z.number().int().min(0),
  status: RequisitionStatus,
  reason: z.string().nullable(),
  requestedBy: Id,
  decidedBy: Id.nullable(),
  decidedAt: Timestamp.nullable(),
  decisionNote: z.string().nullable(),
  createdAt: Timestamp,
});
export type Requisition = z.infer<typeof Requisition>;

export const RequisitionClose = z.object({
  reason: z.string().trim().min(1).max(1000),
});
export type RequisitionClose = z.infer<typeof RequisitionClose>;

export const CandidateSource = z.enum(["referral", "agency", "job-board",
  "website", "social", "direct", "other"]);

export const CandidateCreate = z.object({
  fullName: Name,
  email: Email.optional(),
  phone: z.string().regex(/^\+?\d{7,15}$/).optional(),
  source: CandidateSource,
  sourceDetail: z.string().max(200).optional(),
});
export type CandidateCreate = z.infer<typeof CandidateCreate>;

export const Candidate = z.object({
  id: Id,
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  source: CandidateSource,
  sourceDetail: z.string().nullable(),
  createdAt: Timestamp,
});
export type Candidate = z.infer<typeof Candidate>;

export const Stage = z.enum(["applied", "screening", "interview", "offer",
  "hired", "rejected", "withdrawn"]);
export type Stage = z.infer<typeof Stage>;

/** `hired` is set only by the hire step. */
export const StageMove = z.object({
  stage: Stage.exclude(["hired"]),
  note: z.string().max(1000).optional(),
});
export type StageMove = z.infer<typeof StageMove>;

export const StageEvent = z.object({
  stage: Stage,
  at: Timestamp,
  by: Id,
  note: z.string().nullable(),
});

const Criterion = z.object({
  key: z.string().regex(/^[a-z][a-z0-9-]{0,31}$/),
  rating: z.number().int().min(1).max(5),
  note: z.string().max(1000).nullable(),
});

const Recommendation = z.enum(["strong-no", "no", "yes", "strong-yes"]);

export const Scorecard = z.object({
  id: Id,
  interviewerUserId: Id,
  criteria: z.array(Criterion).min(1).max(10),
  recommendation: Recommendation,
  summary: z.string().nullable(),
  submittedAt: Timestamp,
});

export const ScorecardCreate = z.object({
  criteria: z.array(Criterion).min(1).max(10),
  recommendation: Recommendation,
  summary: z.string().max(2000).optional(),
});
export type ScorecardCreate = z.infer<typeof ScorecardCreate>;

export const Interview = z.object({
  id: Id,
  applicationId: Id,
  startsAt: Timestamp,
  endsAt: Timestamp,
  interviewerUserIds: z.array(Id).min(1).max(5),
  location: z.string().nullable(),
  status: z.enum(["scheduled", "cancelled"]),
  calendar: z.object({
    status: z.enum(["not-connected", "sent", "failed"]),
    externalRef: z.string().nullable(),
  }),
});
export type Interview = z.infer<typeof Interview>;

export const InterviewCreate = z.object({
  startsAt: Timestamp,
  endsAt: Timestamp,
  interviewerUserIds: z.array(Id).min(1).max(5),
  location: z.string().max(300).optional(),
});
export type InterviewCreate = z.infer<typeof InterviewCreate>;

export const ApplicationCreate = z.object({ requisitionId: Id,
  candidateId: Id });
export type ApplicationCreate = z.infer<typeof ApplicationCreate>;

export const Application = z.object({
  id: Id,
  requisitionId: Id,
  candidate: z.object({ id: Id, fullName: z.string() }),
  stage: Stage,
  history: z.array(StageEvent),
  scorecards: z.array(Scorecard),
  interviews: z.array(Interview),
  offerId: Id.nullable(),
  createdAt: Timestamp,
});
export type Application = z.infer<typeof Application>;

export const ApplicationQuery = z.object({
  requisitionId: Id.optional(),
  stage: Stage.optional(),
});
export type ApplicationQuery = z.infer<typeof ApplicationQuery>;

export const RequisitionList = listOf(Requisition);
export const CandidateList = listOf(Candidate);
export const ApplicationList = listOf(Application);
