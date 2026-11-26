import type {
  ExpenseCategory,
  ExpenseCategoryCreate,
  ExpenseCategoryUpdate,
  ExpenseKind,
} from "@payroll/contract";
import { appendAudit } from "../audit/audit";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

interface CategoryRow {
  id: string;
  code: string;
  name: string;
  name_ar: string | null;
  kind: ExpenseKind;
  active: boolean;
}

const toCategory = (r: CategoryRow): ExpenseCategory => ({ id: r.id,
  code: r.code, name: r.name, nameAr: r.name_ar, kind: r.kind,
  active: r.active });

export async function listCategories(tx: Db, companyId: string)
  : Promise<ExpenseCategory[]> {
  const rows = await tx.query<CategoryRow>(
    `SELECT * FROM expense_categories WHERE company_id = $1
     ORDER BY code`, [companyId]);
  return rows.map(toCategory);
}

async function loadCategory(tx: Db, companyId: string, id: string) {
  const [r] = await tx.query<CategoryRow>(
    "SELECT * FROM expense_categories WHERE company_id = $1 AND id = $2",
    [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

/** A taken code is 409 (ON CONFLICT, so a race never gives a 500). */
export async function createCategory(ctx: ReqCtx<ExpenseCategoryCreate>)
  : Promise<ExpenseCategory> {
  const c = ctx.tenant!.companyId;
  const b = ctx.body;
  const id = ctx.deps.newId();
  const at = ctx.deps.now().toISOString();
  const done = await ctx.tx.query(
    `INSERT INTO expense_categories (id, company_id, code, name, name_ar,
       kind, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (company_id, code) DO NOTHING RETURNING id`,
    [id, c, b.code, b.name, b.nameAr ?? null, b.kind, at]);
  if (done.length === 0) throw new ApiError("CATEGORY_CODE_TAKEN");
  await appendAudit(ctx.tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: "expense-category.created", entityType: "expense-category",
    entityId: id, data: {} });
  return toCategory(await loadCategory(ctx.tx, c, id));
}

export async function updateCategory(ctx: ReqCtx<ExpenseCategoryUpdate,
  unknown, { id: string }>): Promise<ExpenseCategory> {
  const c = ctx.tenant!.companyId;
  const r = await loadCategory(ctx.tx, c, ctx.params.id);
  const b = ctx.body;
  const next = { name: b.name ?? r.name,
    name_ar: b.nameAr === undefined ? r.name_ar : b.nameAr,
    active: b.active ?? r.active };
  await ctx.tx.query(
    `UPDATE expense_categories SET name = $3, name_ar = $4, active = $5
     WHERE company_id = $1 AND id = $2`,
    [c, r.id, next.name, next.name_ar, next.active]);
  await appendAudit(ctx.tx, { companyId: c,
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id,
    action: "expense-category.updated", entityType: "expense-category",
    entityId: r.id, data: { changed: Object.keys(b).sort() } });
  return toCategory(await loadCategory(ctx.tx, c, r.id));
}
