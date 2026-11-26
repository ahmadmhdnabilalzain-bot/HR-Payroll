import {
  IsoDate,
  MERGE_FIELDS,
  type Company,
} from "@payroll/contract";
import { fils, parseAed, type Fils } from "@payroll/engine";
import { ApiError } from "../http/errors";
import type { EmployeeRow } from "../people/employees";

type Lang = "en" | "ar";

const BIDI_CONTROLS = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

const group = (digits: string) =>
  digits.replace(/\B(?=(\d{3})+$)/g, ",");

/**
 * en "AED 4,000.00"; ar "4,000.00 درهم". Digits stay Latin and the
 * renderer keeps the amount left to right inside Arabic text.
 */
export function formatMoney(f: Fils, lang: Lang): string {
  const n = `${group((f / 100n).toString())}.` +
    (f % 100n).toString().padStart(2, "0");
  // NEEDS NATIVE REVIEW: the Arabic currency word and its position.
  return lang === "en" ? `AED ${n}` : `${n} درهم`;
}

export interface MergeSource {
  company: Pick<Company, "name" | "nameAr">;
  employee: EmployeeRow | null;
  departmentName: string | null;
  issuerName: string;
  inputs: Readonly<Record<string, string>>;
  letterDate: string;
  letterId: string;
  lang: Lang;
  includeSalary: boolean;
}

const KIND = new Map(MERGE_FIELDS.map((f) => [f.key, f.kind]));

/** Money inputs are parsed and formatted; date inputs must be ISO. */
function inputValue(key: string, raw: string, lang: Lang): string {
  const bad = () => new ApiError("VALIDATION_FAILED", undefined,
    { fields: [`inputs.${key}`] });
  const kind = KIND.get(key);
  if (kind === "money") {
    try {
      return formatMoney(parseAed(raw.trim()), lang);
    } catch {
      throw bad();
    }
  }
  if (kind === "date" && !IsoDate.safeParse(raw.trim()).success) throw bad();
  return raw;
}

function employeeValues(e: EmployeeRow, dept: string | null)
  : Record<string, string | null> {
  return { "employee.fullName": e.fullName,
    "employee.fullNameAr": e.fullNameAr, "employee.number": e.number,
    "employee.jobTitle": e.jobTitle, "employee.nationality": e.nationality,
    "employee.department": dept, "employee.joiningDate": e.joiningDate,
    "employee.lastWorkingDate": e.lastWorkingDate };
}

function salaryValues(e: EmployeeRow | null, lang: Lang)
  : Record<string, string | null> {
  const parts = e?.salary ?? null;
  if (parts === null) return {};
  const basic = parts.find((c) => c.code === "basic");
  const total = parts.reduce((n, c) => n + c.amount, 0n);
  return { "salary.basic": basic === undefined ? null
    : formatMoney(basic.amount, lang),
  "salary.monthlyTotal": formatMoney(fils(total), lang) };
}

/**
 * Every value a letter may merge. Absent data gives no key (so the
 * merge reports it missing); salary keys only when `includeSalary`.
 */
export function buildMergeValues(s: MergeSource): Record<string, string> {
  const all: Record<string, string | null> = {
    "company.name": s.company.name, "company.nameAr": s.company.nameAr,
    "letter.date": s.letterDate, "letter.reference": s.letterId,
    "issuer.name": s.issuerName,
    ...(s.employee === null ? {} : employeeValues(s.employee,
      s.departmentName)),
    ...(s.includeSalary ? salaryValues(s.employee, s.lang) : {}),
  };
  for (const [k, v] of Object.entries(s.inputs)) {
    all[k] = inputValue(k, v, s.lang);
  }
  const out: Record<string, string> = {};
  for (const [k, raw] of Object.entries(all)) {
    // Bidi controls could reorder the printed sentence around a value.
    const v = raw === null ? null : raw.replace(BIDI_CONTROLS, "");
    if (v !== null && v.trim() !== "") out[k] = v;
  }
  return out;
}
