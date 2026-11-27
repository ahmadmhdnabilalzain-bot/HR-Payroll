import {
  calculateProbation,
  EMPLOYMENT_PACKS,
  fils,
  type Allowance,
} from "@payroll/engine";
import {
  FAKE_ROUTING_CODE,
  fakeEmiratesId,
  fakeIban,
  fakePersonId,
  typoIban,
} from "./fake-ids";
import type { Rng } from "./rng";
import {
  BASIC_STEP,
  DEPT_CODES,
  GRADE_BASIC,
  genderOf,
  GRADE_TRANSPORT,
  STAFF,
  type StaffSeed,
} from "./roster-data";
import type { CaseTag, DemoDepartment, DemoEmployee } from "./types";

export const PROBATION_MONTHS = 6;
/** The back-pay case's raise: AED 1,000 basic from 1 September. */
export const BACK_PAY_RAISE = 100000n;
export const DEMO_EMAIL_DOMAIN = "zarqan-demo.test";

export const DEPARTMENTS: readonly DemoDepartment[] = DEPT_CODES.map(
  (code) => ({ id: `dept-${code}`, code, labelKey: `dept.${code}` }));

const pad = (n: number, w: number) => String(n).padStart(w, "0");

function joiningDate(rng: Rng, tag: CaseTag | undefined): string {
  const random = `${rng.int(2012, 2025)}-${pad(rng.int(1, 12), 2)}-` +
    pad(rng.int(1, 28), 2);
  if (tag === "leaver") return "2019-03-10";
  if (tag === "probation") return "2026-10-05";
  return random;
}

function pay(rng: Rng, p: StaffSeed): { basic: bigint;
  allowances: Allowance[] } {
  const basic = GRADE_BASIC[p.grade]! + BASIC_STEP * BigInt(rng.int(0, 8));
  const allowances: Allowance[] = [
    { code: "housing", kind: "housing", monthly: fils(basic * 40n / 100n) },
    { code: "transport", kind: "conveyance",
      monthly: fils(GRADE_TRANSPORT[p.grade]!) },
  ];
  if (p.grade >= 7) {
    allowances.push({ code: "phone", kind: "other", monthly: fils(50000n) });
  }
  return { basic, allowances };
}

/** The engine's probation end; the pack starts 2022-02-02. */
function probationOf(joined: string): string | null {
  if (joined < "2022-02-02") return null;
  return calculateProbation({ joiningDate: joined,
    probationMonths: PROBATION_MONTHS }, EMPLOYMENT_PACKS).value
    .probationEndDate;
}

const emailOf = (name: string) => name.toLowerCase()
  .replace(/[^a-z ]/g, "").trim().replace(/\s+/g, ".") +
  `@${DEMO_EMAIL_DOMAIN}`;

function ibanOf(n: number, tag: CaseTag | undefined) {
  if (tag === "missing-iban") return null;
  return tag === "iban-typo" ? typoIban(n) : fakeIban(n);
}

function employeeOf(p: StaffSeed, i: number, rng: Rng): DemoEmployee {
  const n = i + 1;
  const joined = joiningDate(rng, p.tag);
  const { basic, allowances } = pay(rng, p);
  return { id: `emp-${pad(n, 3)}`, number: `ZB-${pad(n, 4)}`,
    fullName: p.name, fullNameAr: p.nameAr, email: emailOf(p.name),
    departmentId: `dept-${p.dept}`, jobKey: p.job, grade: p.grade,
    location: p.location, nationality: p.nationality,
    gender: genderOf(p.name),
    workerClass: p.nationality === "AE" ? "uae-national"
      : "expat-full-time",
    joiningDate: joined,
    leavingDate: p.tag === "leaver" ? "2026-10-15" : null,
    probationMonths: PROBATION_MONTHS, probationEndDate: probationOf(joined),
    basicMonthly: fils(basic), allowances,
    emiratesId: fakeEmiratesId(p.birthYear, n), iban: ibanOf(n, p.tag),
    routingCode: FAKE_ROUTING_CODE, labourPersonId: fakePersonId(n),
    cases: p.tag === undefined ? [] : [p.tag] };
}

/** 31 staff in 9 departments; the seed varies pay and joining dates. */
export function buildRoster(rng: Rng): DemoEmployee[] {
  return STAFF.map((p, i) => employeeOf(p, i, rng));
}
