import { z } from "zod";
import { SalaryComponent } from "./employee";
import { Id, IsoDate, listOf, Name, Timestamp } from "./primitives";
import { TraceLine } from "./trace";

export const OfferStatus = z.enum(["pending-approval", "approved",
  "rejected", "accepted", "declined", "withdrawn", "hired"]);
export type OfferStatus = z.infer<typeof OfferStatus>;

/**
 * Legal limits on probation and notice are checked by the engine
 * (`ae-employment`), not here: zod only asks for whole numbers.
 */
export const OfferCreate = z.object({
  applicationId: Id,
  jobTitle: Name,
  departmentId: Id.optional(),
  /** The new joiner's manager (an employee id). */
  managerId: Id.optional(),
  startDate: IsoDate,
  salary: z.array(SalaryComponent).min(1).max(30),
  probationMonths: z.number().int().min(0),
  contractNoticeDays: z.number().int().min(1),
  expiresOn: IsoDate.optional(),
  note: z.string().max(1000).optional(),
});
export type OfferCreate = z.infer<typeof OfferCreate>;

export const Offer = z.object({
  id: Id,
  applicationId: Id,
  candidateName: z.string(),
  jobTitle: z.string(),
  departmentId: Id.nullable(),
  managerId: Id.nullable(),
  startDate: IsoDate,
  /** `null`: not visible to you (owner and hr only). */
  salary: z.array(SalaryComponent).nullable(),
  probationMonths: z.number().int(),
  probationEndDate: IsoDate.nullable(),
  contractNoticeDays: z.number().int(),
  /** Engine trace lines for the probation and notice terms. */
  termsTrace: z.array(TraceLine),
  expiresOn: IsoDate.nullable(),
  status: OfferStatus,
  createdBy: Id,
  decidedBy: Id.nullable(),
  decidedAt: Timestamp.nullable(),
  respondedOn: IsoDate.nullable(),
  employeeId: Id.nullable(),
  createdAt: Timestamp,
});
export type Offer = z.infer<typeof Offer>;

/** Candidates have no login: hr records the response (Ruling 22). */
export const OfferResponse = z.object({
  accepted: z.boolean(),
  respondedOn: IsoDate,
});
export type OfferResponse = z.infer<typeof OfferResponse>;

export const OfferList = listOf(Offer);
