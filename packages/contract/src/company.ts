import { z } from "zod";
import { Email, EmployerId, Id, Name, RoutingCode } from "./primitives";

export const WpsSettings = z.object({
  employerId: EmployerId.nullable(),
  bankRoutingCode: RoutingCode.nullable(),
});

export const Company = z.object({
  id: Id,
  name: Name,
  nameAr: z.string().max(200).nullable(),
  wps: WpsSettings,
});
export type Company = z.infer<typeof Company>;

export const CompanyUpdate = z.object({
  name: Name.optional(),
  nameAr: z.string().max(200).nullable().optional(),
  wps: WpsSettings.optional(),
});
export type CompanyUpdate = z.infer<typeof CompanyUpdate>;

export const SignupRequest = z.object({
  companyName: Name,
  email: Email,
  password: z.string().min(12).max(200),
  displayName: Name,
});
export type SignupRequest = z.infer<typeof SignupRequest>;
