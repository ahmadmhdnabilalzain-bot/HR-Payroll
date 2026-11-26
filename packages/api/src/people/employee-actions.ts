import type { EmployeeCreate, SalaryUpdate } from "@payroll/contract";
import { appendAudit, type AuditData } from "../audit/audit";
import type { ReqCtx } from "../http/context";
import {
  checkEmployeeRefs,
  checkSalary,
  insertEmployee,
  saveSalary,
  updateEmployee as writeEmployee,
  type EmployeeWrite,
} from "./employee-writes";
import { loadEmployee, type EmployeeRow } from "./employees";

/**
 * Internal versions of POST /v1/employees, PUT .../salary and PATCH
 * /v1/employees/{id}, each writing its Plan 3 audit event, for Plan
 * 8's hire and exit flows (in the request's one transaction). The
 * Plan 3 route handlers keep their own guards (MFA on salary writes,
 * no self-edit); callers here must stand for those guards (see the
 * hire: the salary is the owner's MFA-approved offer).
 */
const company = (ctx: ReqCtx) => ctx.tenant!.companyId;

async function audit(ctx: ReqCtx, action: string, id: string,
  data: AuditData = {}): Promise<void> {
  await appendAudit(ctx.tx, { companyId: company(ctx),
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id, action,
    entityType: "employee", entityId: id, data });
}

export async function createEmployee(ctx: ReqCtx, body: EmployeeCreate,
  id: string = ctx.deps.newId()): Promise<EmployeeRow> {
  await checkEmployeeRefs(ctx.tx, company(ctx), body, null);
  await insertEmployee(ctx.tx, ctx.deps, company(ctx), id, body);
  await audit(ctx, "employee.created", id);
  return loadEmployee(ctx.tx, ctx.deps, company(ctx), id);
}

export async function setSalary(ctx: ReqCtx, employeeId: string,
  body: SalaryUpdate): Promise<EmployeeRow> {
  checkSalary(body.components);
  const version = await saveSalary(ctx.tx, ctx.deps, company(ctx),
    employeeId, body.components);
  await audit(ctx, "employee.salary.updated", employeeId, { version });
  return loadEmployee(ctx.tx, ctx.deps, company(ctx), employeeId);
}

/** A PATCH; `null` clears an optional field (e.g. lastWorkingDate). */
export type EmployeePatch = EmployeeWrite;

export async function updateEmployee(ctx: ReqCtx, id: string,
  patch: EmployeePatch): Promise<EmployeeRow> {
  const changed = Object.keys(patch).filter((k) =>
    patch[k as keyof EmployeePatch] !== undefined).sort();
  await checkEmployeeRefs(ctx.tx, company(ctx), patch, id);
  await writeEmployee(ctx.tx, ctx.deps, company(ctx), id, patch);
  await audit(ctx, "employee.updated", id, { changed });
  return loadEmployee(ctx.tx, ctx.deps, company(ctx), id);
}
