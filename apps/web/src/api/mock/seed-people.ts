// NEEDS NATIVE REVIEW: the Arabic names and labels below were written by
// Claude and are not confirmed by a native speaker. All people invented.
import { fils, type Fils } from "@payroll/engine";
import type { AppSalaryComponent, Department, WorkerClass } from "../contract";
import { KIND, uid } from "./seed-types";

export const DEPARTMENTS: Department[] = [
  ["Finance", "المالية"],
  ["Operations", "العمليات"],
  ["Sales", "المبيعات"],
].map(([name, nameAr], i) => ({
  id: uid(KIND.department, i + 1), name: name ?? "", nameAr: nameAr ?? null,
  headEmployeeId: null,
}));

export interface PersonSpec {
  name: string;
  nameAr: string;
  dept: number;
  job: string;
  nationality: string;
  workerClass: WorkerClass;
  basic: bigint;
  housing: bigint;
  transport: bigint;
}

const p = (
  name: string, nameAr: string, dept: number, job: string,
  nationality: string, basic: number, housing: number, transport = 0,
  workerClass: WorkerClass = "expat-full-time",
): PersonSpec => ({ name, nameAr, dept, job, nationality, workerClass,
  basic: BigInt(basic) * 100n, housing: BigInt(housing) * 100n,
  transport: BigInt(transport) * 100n });

/** The first ten were employed before this month. */
export const PEOPLE: PersonSpec[] = [
  p("Sara Ali", "سارة علي", 0, "Finance manager", "JO", 18000, 7000, 1500),
  p("Omar Haddad", "عمر حداد", 1, "Operations manager", "LB", 16000, 6000),
  p("Priya Nair", "بريا ناير", 0, "Accountant", "IN", 9000, 3500, 800),
  p("Ahmed Khan", "أحمد خان", 2, "Sales executive", "PK", 7000, 2500, 800),
  p("Fatima Zahra", "فاطمة الزهراء", 1, "Coordinator", "MA", 6500, 2500),
  p("John Mathew", "جون ماثيو", 1, "Driver", "IN", 3500, 1200, 500),
  p("Maria Santos", "ماريا سانتوس", 1, "Storekeeper", "PH", 4000, 1500),
  p("Hassan Ibrahim", "حسن إبراهيم", 2, "Sales executive", "EG", 7000,
    2500, 800),
  p("Li Wei", "لي وي", 0, "Payroll officer", "CN", 8000, 3000),
  p("Noura Saeed", "نورة سعيد", 2, "Sales manager", "AE", 20000, 8000,
    2000, "uae-national"),
  p("Daniel Okafor", "دانيال أوكافور", 2, "Sales executive", "NG", 6000,
    2000),
  p("Aisha Rahman", "عائشة رحمن", 0, "Accountant", "BD", 8500, 3000),
];

const comp = (
  code: string, label: string, labelAr: string, amount: Fils,
  sifBucket: AppSalaryComponent["sifBucket"],
): AppSalaryComponent => ({ code, label, labelAr, amount, sifBucket });

export function salaryOf(s: PersonSpec): AppSalaryComponent[] {
  const out = [
    comp("basic", "Basic salary", "الراتب الأساسي", fils(s.basic), "fixed"),
    comp("housing", "Housing allowance", "بدل السكن", fils(s.housing),
      "housing"),
  ];
  if (s.transport > 0n) {
    out.push(comp("transport", "Transport allowance", "بدل المواصلات",
      fils(s.transport), "conveyance"));
  }
  return out;
}
