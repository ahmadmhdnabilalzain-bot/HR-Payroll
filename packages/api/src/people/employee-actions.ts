import type {
  EmployeeCreate,
  EmployeeUpdate,
  SalaryUpdate,
} from "@payroll/contract";
import { appendAudit, type AuditData } from "../audit/audit";
import type { ReqCtx } from "../http/context";
import {
  asCreate,
  checkEmployeeRefs,
  checkSalary,
  insertEmployee,
  saveSalary,
  updateEmployee as writeEmployee,
} from "./employee-writes";
import { loadEmployee, type EmployeeRow } from "./employees";

/**
 * The code behind POST /v1/employees, PUT .../salary and PATCH
 * /v1/employees/{id}, each writing its Plan 3 audit event. Plan 8's
 * hire and exit flows call these in the request's one transaction.
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

/** A PATCH; internal callers may pass `lastWorkingDate: null`. */
export type EmployeePatch = Omit<EmployeeUpdate, "lastWorkingDate"> & {
  lastWorkingDate?: string | null | undefined;
};

export async function updateEmployee(ctx: ReqCtx, id: string,
  patch: EmployeePatch): Promise<EmployeeRow> {
  const row = await loadEmployee(ctx.tx, ctx.deps, company(ctx), id);
  const changed = Object.keys(patch).filter((k) =>
    patch[k as keyof EmployeePatch] !== undefined).sort();
  const next = { ...asCreate(row), ...patch } as EmployeeCreate;
  if (patch.lastWorkingDate === null) delete next.lastWorkingDate;
  await checkEmployeeRefs(ctx.tx, company(ctx), next, row.id);
  await writeEmployee(ctx.tx, ctx.deps, company(ctx), row.id, next);
  await audit(ctx, "employee.updated", row.id, { changed });
  return loadEmployee(ctx.tx, ctx.deps, company(ctx), id);
}
