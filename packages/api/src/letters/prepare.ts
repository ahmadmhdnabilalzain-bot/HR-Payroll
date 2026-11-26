import {
  KINDS_NEEDING_EMPLOYEE,
  LETTER_GENERATE_ROLES,
  type LetterRequest,
} from "@payroll/contract";
import { isPayroll } from "../documents/access";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { loadEmployee, type EmployeeRow } from "../people/employees";
import type { LetterPage } from "../pdf/renderer";
import { dubaiDate } from "../time/dubai";
import { mergeTemplate, type Segment } from "./merge";
import {
  loadTemplate,
  publishedOf,
  templateVersions,
  type TemplateRow,
  type TVersionRow,
} from "./template-store";
import { buildMergeValues } from "./values";

// NEEDS NATIVE REVIEW: the Arabic labels.
export const LETTER_LABELS = {
  en: { date: "Date", ref: "Reference" },
  ar: { date: "التاريخ", ref: "المرجع" },
} as const;

export interface PreparedLetter {
  page: LetterPage;
  template: TemplateRow;
  version: TVersionRow;
  employeeId: string | null;
  values: Record<string, string>;
  letterId: string;
  letterDate: string;
}

/** Template, published version, role and salary rules, in order. */
async function templateFor(ctx: ReqCtx, req: LetterRequest) {
  const template = await loadTemplate(ctx, req.templateId);
  const version = publishedOf(await templateVersions(ctx, template.id));
  if (version === null) throw new ApiError("TEMPLATE_NOT_PUBLISHED");
  if (!LETTER_GENERATE_ROLES[template.kind].includes(ctx.tenant!.role)) {
    throw new ApiError("FORBIDDEN");
  }
  if (version.uses_salary && !isPayroll(ctx)) {
    throw new ApiError("SALARY_LETTER_NEEDS_HR");
  }
  return { template, version };
}

/**
 * The letter's employee: required for most kinds; owner and hr may
 * name anyone, a manager only a direct report (never themself);
 * anyone else 404.
 */
async function employeeFor(ctx: ReqCtx, t: TemplateRow, id?: string)
  : Promise<EmployeeRow | null> {
  if (id === undefined) {
    if (KINDS_NEEDING_EMPLOYEE.includes(t.kind)) {
      throw new ApiError("EMPLOYEE_REQUIRED");
    }
    return null;
  }
  const c = ctx.tenant!.companyId;
  const e = await loadEmployee(ctx.tx, ctx.deps, c, id);
  const own = ctx.tenant!.employeeId;
  const report = own !== null && e.managerId === own && e.id !== own;
  if (!isPayroll(ctx) && !report) throw new ApiError("NOT_FOUND");
  return e;
}

async function companyOf(ctx: ReqCtx) {
  const [c] = await ctx.tx.query<{ name: string; name_ar: string | null }>(
    "SELECT name, name_ar FROM companies WHERE id = $1",
    [ctx.tenant!.companyId]);
  return { name: c!.name, nameAr: c!.name_ar };
}

async function departmentName(ctx: ReqCtx, e: EmployeeRow | null) {
  if (e?.departmentId == null) return null;
  const [d] = await ctx.tx.query<{ name: string }>(
    "SELECT name FROM departments WHERE company_id = $1 AND id = $2",
    [ctx.tenant!.companyId, e.departmentId]);
  return d?.name ?? null;
}

const label = (l: string, v: string): Segment[] =>
  [{ text: `${l}: `, isolate: false }, { text: v, isolate: true }];

function pageOf(p: Omit<PreparedLetter, "page">, watermark: string | null)
  : LetterPage {
  const lang = p.template.lang;
  const heading = lang === "en" ? p.values["company.name"]
    : p.values["company.nameAr"];
  if (heading === undefined) {
    throw new ApiError("MERGE_VALUE_MISSING", undefined,
      { fields: [lang === "en" ? "company.name" : "company.nameAr"] });
  }
  const merged = mergeTemplate(p.version.body, p.values);
  const title = p.values["issuer.title"];
  return { lang, heading, watermark, title: merged.title,
    dateLine: label(LETTER_LABELS[lang].date, p.letterDate),
    refLine: label(LETTER_LABELS[lang].ref, p.letterId),
    paragraphs: merged.paragraphs,
    issuerLines: [p.values["issuer.name"]!,
      ...(title === undefined ? [] : [title])] };
}

/**
 * Everything checked and merged, nothing written. Salary values are
 * only gathered for owner and hr (whatever the template says).
 */
export async function prepareLetter(ctx: ReqCtx, req: LetterRequest,
  watermark: string | null): Promise<PreparedLetter> {
  const { template, version } = await templateFor(ctx, req);
  const employee = await employeeFor(ctx, template, req.employeeId);
  const letterId = ctx.deps.newId();
  const letterDate = dubaiDate(ctx.deps.now());
  const values = buildMergeValues({ company: await companyOf(ctx),
    employee, departmentName: await departmentName(ctx, employee),
    issuerName: ctx.user!.display_name, inputs: req.inputs, letterDate,
    letterId, lang: template.lang, includeSalary: isPayroll(ctx) });
  const p = { template, version, employeeId: employee?.id ?? null, values,
    letterId, letterDate };
  return { ...p, page: pageOf(p, watermark) };
}
