import {
  calculateProbation,
  EMPLOYMENT_PACKS,
  fils,
  type Allowance,
} from "@payroll/engine";
import { ROUTING_CODES } from "@payroll/wps";
import { fakeEmiratesId, fakeIban, fakePersonId } from "./fake-ids";
import type { Rng } from "./rng";
import {
  BASIC_STEP,
  DEPT_CODES,
  GRADE_BASIC,
  GRADE_TRANSPORT,
  PEOPLE,
  POSTS,
  type PersonSeed,
} from "./roster-data";
import type { CaseTag, DemoDepartment, DemoEmployee } from "./types";

export const PROBATION_MONTHS = 6;
/** The back-pay case's raise: AED 1,000 basic from 1 September. */
export const BACK_PAY_RAISE = 100000n;

export const DEPARTMENTS: readonly DemoDepartment[] = DEPT_CODES.map(
  (code) => ({ id: `dept-${code}`, code, labelKey: `dept.${code}` }));

interface Slot { i: number; person: PersonSeed; dept: string;
  jobKey: string; grade: number }

const pad = (n: number, w: number) => String(n).padStart(w, "0");

function slots(rng: Rng): Slot[] {
  return rng.shuffle(PEOPLE).map((person, i) => {
    const code = DEPT_CODES[Math.floor(i / 8)]!;
    const [jobKey, grade] = POSTS[code][i % 8]!;
    return { i, person, dept: `dept-${code}`, jobKey, grade };
  });
}

type Pred = (s: Slot) => boolean;
const expat: Pred = (s) => s.person.nationality !== "AE";

/** Special cases by rule, each on a different person, any seed. */
function assignCases(all: Slot[]): Map<number, CaseTag> {
  const taken = new Map<number, CaseTag>();
  const pick = (tag: CaseTag, ...preds: Pred[]) => {
    for (const pred of preds) {
      const s = all.find((x) => !taken.has(x.i) && pred(x));
      if (s !== undefined) {
        taken.set(s.i, tag);
        return;
      }
    }
    throw new Error(`no employee fits the ${tag} case`);
  };
  pick("leaver", (s) => expat(s) && s.grade === 3, expat);
  pick("probation", (s) => expat(s) && s.grade === 2, expat);
  pick("overtime", (s) => expat(s) && s.dept === "dept-ops" &&
    s.grade <= 2, (s) => expat(s) && s.grade <= 2, expat);
  pick("unpaid-leave", (s) => expat(s) && s.grade <= 3, expat);
  pick("back-pay", (s) => expat(s) && s.grade === 4, expat);
  pick("missing-iban", (s) => expat(s) && s.grade === 2, expat);
  pick("loan", (s) => s.grade === 3, () => true);
  return taken;
}

function joiningDate(rng: Rng, tag: CaseTag | undefined): string {
  if (tag === "leaver") return "2019-03-10";
  if (tag === "probation") return "2026-08-01";
  if (tag === "missing-iban") return "2026-12-01";
  return `${rng.int(2016, 2025)}-${pad(rng.int(1, 12), 2)}-` +
    pad(rng.int(1, 28), 2);
}

function pay(rng: Rng, grade: number): { basic: bigint;
  allowances: Allowance[] } {
  const basic = GRADE_BASIC[grade]! + BASIC_STEP * BigInt(rng.int(0, 4));
  const allowances: Allowance[] = [
    { code: "housing", kind: "housing", monthly: fils(basic * 40n / 100n) },
    { code: "transport", kind: "conveyance",
      monthly: fils(GRADE_TRANSPORT[grade]!) },
  ];
  if (grade >= 4) {
    allowances.push({ code: "phone", kind: "other", monthly: fils(50000n) });
  }
  return { basic, allowances };
}

/**
 * The engine's probation end. The employment pack starts on
 * 2022-02-02, so earlier joiners get null (long past, not computed).
 */
function probationOf(joined: string): { probationEndDate: string | null } {
  if (joined < "2022-02-02") return { probationEndDate: null };
  return calculateProbation({ joiningDate: joined,
    probationMonths: PROBATION_MONTHS }, EMPLOYMENT_PACKS).value;
}

function emailOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z ]/g, "").trim()
    .replace(/\s+/g, ".") + "@demo-company.test";
}

function employeeOf(s: Slot, rng: Rng, tag: CaseTag | undefined)
  : DemoEmployee {
  const n = s.i + 1;
  const joined = joiningDate(rng, tag);
  const { basic, allowances } = pay(rng, s.grade);
  const routing = ROUTING_CODES[rng.int(0, ROUTING_CODES.length - 1)]!;
  const probation = probationOf(joined);
  return { id: `emp-${pad(n, 3)}`, number: `DC-${pad(n, 4)}`,
    fullName: s.person.name, fullNameAr: s.person.nameAr,
    email: emailOf(s.person.name), departmentId: s.dept,
    jobKey: s.jobKey, grade: s.grade,
    nationality: s.person.nationality,
    workerClass: s.person.nationality === "AE" ? "uae-national"
      : "expat-full-time",
    joiningDate: joined,
    leavingDate: tag === "leaver" ? "2026-10-15" : null,
    probationMonths: PROBATION_MONTHS,
    probationEndDate: probation.probationEndDate,
    basicMonthly: fils(basic), allowances,
    emiratesId: fakeEmiratesId(s.person.birthYear, n),
    iban: tag === "missing-iban" ? null : fakeIban(routing.entityId, n),
    routingCode: routing.code, labourPersonId: fakePersonId(n),
    cases: tag === undefined ? [] : [tag] };
}

/** 48 employees in 6 departments; the seed shuffles and varies pay. */
export function buildRoster(rng: Rng): DemoEmployee[] {
  const all = slots(rng);
  const cases = assignCases(all);
  return all.map((s) => employeeOf(s, rng, cases.get(s.i)));
}
