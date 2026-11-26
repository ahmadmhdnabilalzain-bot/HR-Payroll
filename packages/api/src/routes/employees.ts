import type {
  BankDetails,
  EmployeeCreate,
  EmployeeUpdate,
  SalaryUpdate,
} from "@payroll/contract";
import { appendAudit, type AuditData } from "../audit/audit";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import {
  asCreate,
  checkEmployeeRefs,
  checkSalary,
  insertEmployee,
  saveBank,
  saveSalary,
  updateEmployee,
} from "../people/employee-writes";
import { listEmployees, loadEmployee } from "../people/employees";
import { inScope, toEmployeeView, viewerScope } from "../people/redact";
import { dubaiDate } from "../time/dubai";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

const company = (ctx: ReqCtx) => ctx.tenant!.companyId;
const today = (ctx: ReqCtx) => dubaiDate(ctx.deps.now());

async function audit(ctx: ReqCtx, action: string, id: string,
  data: AuditData = {}): Promise<void> {
  await appendAudit(ctx.tx, { companyId: company(ctx),
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id, action,
    entityType: "employee", entityId: id, data });
}

/** Loads one employee the caller may see; out of scope is 404. */
async function visible(ctx: IdCtx) {
  const row = await loadEmployee(ctx.tx, ctx.deps, company(ctx),
    ctx.params.id);
  if (!inScope(viewerScope(ctx.tenant!), row)) {
    throw new ApiError("NOT_FOUND");
  }
  return row;
}

async function view(ctx: ReqCtx, id: string) {
  const row = await loadEmployee(ctx.tx, ctx.deps, company(ctx), id);
  return toEmployeeView(row, ctx.tenant!, today(ctx));
}

async function list(ctx: ReqCtx) {
  const scope = viewerScope(ctx.tenant!);
  const rows = await listEmployees(ctx.tx, ctx.deps, company(ctx));
  return { items: rows.filter((r) => inScope(scope, r))
    .map((r) => toEmployeeView(r, ctx.tenant!, today(ctx))) };
}

async function create(ctx: ReqCtx<EmployeeCreate>) {
  const id = ctx.deps.newId();
  await checkEmployeeRefs(ctx.tx, company(ctx), ctx.body, null);
  await insertEmployee(ctx.tx, ctx.deps, company(ctx), id, ctx.body);
  await audit(ctx, "employee.created", id);
  return view(ctx, id);
}

async function update(ctx: IdCtx<EmployeeUpdate>) {
  const row = await visible(ctx);
  const changed = Object.keys(ctx.body).filter((k) =>
    ctx.body[k as keyof EmployeeUpdate] !== undefined).sort();
  const next = { ...asCreate(row), ...ctx.body } as EmployeeCreate;
  await checkEmployeeRefs(ctx.tx, company(ctx), next, row.id);
  await updateEmployee(ctx.tx, ctx.deps, company(ctx), row.id, next);
  await audit(ctx, "employee.updated", row.id, { changed });
  return view(ctx, row.id);
}

async function putSalary(ctx: IdCtx<SalaryUpdate>) {
  const row = await visible(ctx);
  checkSalary(ctx.body.components);
  const version = await saveSalary(ctx.tx, ctx.deps, company(ctx), row.id,
    ctx.body.components);
  await audit(ctx, "employee.salary.updated", row.id, { version });
  return view(ctx, row.id);
}

async function putBank(ctx: IdCtx<BankDetails>) {
  const row = await visible(ctx);
  await saveBank(ctx.tx, ctx.deps, company(ctx), row.id, ctx.body);
  await audit(ctx, "employee.bank.updated", row.id,
    { changed: ["routingCode", "iban"] });
  return view(ctx, row.id);
}

/** Full IBAN (owner/hr, MFA session); every reveal is audited. */
async function revealBank(ctx: IdCtx) {
  const row = await visible(ctx);
  if (row.bank === null) throw new ApiError("NOT_FOUND");
  await audit(ctx, "employee.bank.revealed", row.id);
  return { routingCode: row.bank.routingCode, iban: row.bank.iban };
}

export function registerEmployeeRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "listEmployees", list);
  register(app, deps, "getEmployee", async (ctx: IdCtx) =>
    toEmployeeView(await visible(ctx), ctx.tenant!, today(ctx)));
  register(app, deps, "createEmployee", create);
  register(app, deps, "updateEmployee", update);
  register(app, deps, "putEmployeeSalary", putSalary);
  register(app, deps, "putEmployeeBank", putBank);
  register(app, deps, "getEmployeeBank", revealBank);
}
