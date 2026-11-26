import { z } from "zod";
import { Id, Name } from "./primitives";

export const Department = z.object({
  id: Id,
  name: Name,
  nameAr: z.string().max(200).nullable(),
  headEmployeeId: Id.nullable(),
});
export type Department = z.infer<typeof Department>;

export const DepartmentCreate = z.object({
  name: Name,
  nameAr: z.string().max(200).nullable().optional(),
  headEmployeeId: Id.nullable().optional(),
});
export type DepartmentCreate = z.infer<typeof DepartmentCreate>;

export const DepartmentUpdate = DepartmentCreate.partial();
export type DepartmentUpdate = z.infer<typeof DepartmentUpdate>;
