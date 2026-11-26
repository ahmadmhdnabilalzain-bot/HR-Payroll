import { DOCUMENT_ROUTES } from "@payroll/contract";
import { PLAN6_PENDING } from "./plan6-pending";

const SERVED: readonly string[] = [
  "fileUpload",
];

/**
 * Plan 7 route ids not yet served while the plan is built task by
 * task. Each task adds the ids it serves to SERVED; Task 8 asserts
 * the list is empty.
 */
export const PLAN7_PENDING: ReadonlySet<string> = new Set(
  DOCUMENT_ROUTES.map((r) => r.id).filter((id) => !SERVED.includes(id)));

/** Skipped by the conformance, leak and runtime-role flow suites. */
export const isPending = (id: string): boolean =>
  PLAN6_PENDING.has(id) || PLAN7_PENDING.has(id);
