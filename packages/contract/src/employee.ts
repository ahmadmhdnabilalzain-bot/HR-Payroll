import { z } from "zod";
import {
  Email,
  Iban,
  Id,
  IsoDate,
  Money,
  Name,
  PersonId,
  RoutingCode,
} from "./primitives";

export const WorkerClass = z.enum([
  "expat-full-time",
  "uae-national",
  "gcc-national",
]);
export type WorkerClass = z.infer<typeof WorkerClass>;

/** Where a component goes in the SIF: EDR fixed, or one EVP column. */
export const SifBucket = z.enum([
  "fixed",
  "housing",
  "conveyance",
  "medical",
  "passage",
  "overtime",
  "otherAllowances",
  "leaveEncashment",
]);
export type SifBucket = z.infer<typeof SifBucket>;

export const ComponentCode = z.string().regex(/^[a-z][a-z0-9-]{0,31}$/);

export const SalaryComponent = z.object({
  code: ComponentCode,
  label: Name,
  labelAr: z.string().max(200).nullable(),
  amount: Money,
  sifBucket: SifBucket,
});
export type SalaryComponent = z.infer<typeof SalaryComponent>;

export const SalaryUpdate = z.object({
  components: z.array(SalaryComponent).min(1).max(30),
});
export type SalaryUpdate = z.infer<typeof SalaryUpdate>;

export const BankDetails = z.object({ routingCode: RoutingCode, iban: Iban });
export type BankDetails = z.infer<typeof BankDetails>;

export const BankMasked = z.object({
  routingCode: RoutingCode,
  ibanLast4: z.string().regex(/^\d{4}$/),
});
export type BankMasked = z.infer<typeof BankMasked>;

export const EmiratesIdNumber = z.string().regex(/^784\d{12}$/);
const Nationality = z.string().regex(/^[A-Z]{2}$/);

export const EmployeeCreate = z.object({
  number: z.string().trim().min(1).max(40),
  fullName: Name,
  fullNameAr: z.string().max(200).optional(),
  email: Email.optional(),
  departmentId: Id.optional(),
  managerId: Id.optional(),
  jobTitle: Name,
  nationality: Nationality,
  workerClass: WorkerClass,
  joiningDate: IsoDate,
  lastWorkingDate: IsoDate.optional(),
  labourPersonId: PersonId.optional(),
  emiratesIdNumber: EmiratesIdNumber.optional(),
});
export type EmployeeCreate = z.infer<typeof EmployeeCreate>;

export const EmployeeUpdate = EmployeeCreate.partial();
export type EmployeeUpdate = z.infer<typeof EmployeeUpdate>;

/**
 * What a caller sees. `null` on a protected field (salary, bank,
 * labourPersonId, emiratesIdNumber) means "not visible to you or not
 * set". Optional create fields are `null` when unset.
 */
export const EmployeeView = z.object({
  id: Id,
  number: z.string(),
  fullName: Name,
  fullNameAr: z.string().nullable(),
  email: Email.nullable(),
  departmentId: Id.nullable(),
  managerId: Id.nullable(),
  jobTitle: Name,
  nationality: Nationality,
  workerClass: WorkerClass,
  joiningDate: IsoDate,
  lastWorkingDate: IsoDate.nullable(),
  status: z.enum(["active", "left"]),
  salary: z.array(SalaryComponent).nullable(),
  bank: BankMasked.nullable(),
  labourPersonId: PersonId.nullable(),
  emiratesIdNumber: z.string().nullable(),
  /**
   * Protected fields whose stored value could not be decrypted (shown
   * as null). Absent when everything the caller may see was readable.
   */
  unreadable: z.array(z.enum(["salary", "bank", "labourPersonId",
    "emiratesIdNumber"])).optional(),
});
export type EmployeeView = z.infer<typeof EmployeeView>;
