import type {
  Department,
  DepartmentCreate,
  DepartmentUpdate,
} from "@payroll/contract";
import { appendAudit, type AuditData } from "../audit/audit";
import type { Db } from "../db/db";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

interface Row {
  id: string;
  name: string;
  name_ar: string | null;
  head_employee_id: string | null;
}

const toDepartment = (r: Row): Department => ({ id: r.id, name: r.name,
  nameAr: r.name_ar, headEmployeeId: r.head_employee_id });

async function load(tx: Db, companyId: string, id: string): Promise<Row> {
  const [r] = await tx.query<Row>(
    `SELECT id, name, name_ar, head_employee_id FROM departments
     WHERE company_id = $1 AND id = $2`, [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

async function checkHead(tx: Db, companyId: string, head: string | null) {
  if (head === null) return;
  const r = await tx.query(
    "SELECT 1 FROM employees WHERE company_id = $1 AND id = $2",
    [companyId, head]);
  if (r.length === 0) {
    throw new ApiError("NOT_FOUND", "No such employee",
      { fields: ["body.headEmployeeId"] });
  }
}

async function audit(ctx: ReqCtx, action: string, id: string,
  data: AuditData = {}) {
  await appendAudit(ctx.tx, { companyId: ctx.tenant!.companyId,
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id, action,
    entityType: "department", entityId: id, data });
}

async function create(ctx: ReqCtx<DepartmentCreate>) {
  const c = ctx.tenant!.companyId;
  const b = ctx.body;
  const id = ctx.deps.newId();
  await checkHead(ctx.tx, c, b.headEmployeeId ?? null);
  await ctx.tx.query(
    `INSERT INTO departments (id, company_id, name, name_ar,
       head_employee_id, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, c, b.name, b.nameAr ?? null, b.headEmployeeId ?? null,
      ctx.deps.now().toISOString()]);
  await audit(ctx, "department.created", id);
  return toDepartment(await load(ctx.tx, c, id));
}

async function update(ctx: ReqCtx<DepartmentUpdate, unknown,
  { id: string }>) {
  const c = ctx.tenant!.companyId;
  const r = await load(ctx.tx, c, ctx.params.id);
  const b = ctx.body;
  const next: Row = { ...r, name: b.name ?? r.name,
    name_ar: b.nameAr === undefined ? r.name_ar : b.nameAr,
    head_employee_id: b.headEmployeeId === undefined ? r.head_employee_id
      : b.headEmployeeId };
  await checkHead(ctx.tx, c, next.head_employee_id);
  await ctx.tx.query(
    `UPDATE departments SET name = $3, name_ar = $4, head_employee_id = $5
     WHERE company_id = $1 AND id = $2`,
    [c, r.id, next.name, next.name_ar, next.head_employee_id]);
  const changed = Object.keys(b).filter((k) =>
    b[k as keyof DepartmentUpdate] !== undefined).sort();
  await audit(ctx, "department.updated", r.id, { changed });
  return toDepartment(next);
}

export function registerDepartmentRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "listDepartments", async (ctx) => ({
    items: (await ctx.tx.query<Row>(
      `SELECT id, name, name_ar, head_employee_id FROM departments
       WHERE company_id = $1 ORDER BY name, id`, [ctx.tenant!.companyId]))
      .map(toDepartment) }));
  register(app, deps, "createDepartment", create);
  register(app, deps, "updateDepartment", update);
}
