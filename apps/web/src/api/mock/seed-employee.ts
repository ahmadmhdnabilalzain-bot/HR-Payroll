import { IBAN_SENTINEL } from "../contract";
import { DEPARTMENTS, salaryOf, type PersonSpec } from "./seed-people";
import { KIND, uid, type MockEmployee } from "./seed-types";

const slug = (name: string): string =>
  name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.+|\.+$/g, "");

/** Mashreq's code: its bank id (033) matches the sample IBAN's. */
export const DEMO_ROUTING = "203320101";

export const empId = (n: number): string => uid(KIND.employee, n);

export function employeeFrom(
  s: PersonSpec, n: number, joiningDate: string, bank: boolean,
): MockEmployee {
  return {
    id: empId(n), number: `E-${String(n).padStart(3, "0")}`,
    fullName: s.name, fullNameAr: s.nameAr,
    email: `e${n}.${slug(s.name)}@demo.test`,
    departmentId: DEPARTMENTS[s.dept]?.id ?? null,
    managerId: [5, 6, 7].includes(n) ? empId(2) : null,
    jobTitle: s.job, nationality: s.nationality, workerClass: s.workerClass,
    joiningDate, lastWorkingDate: null, status: "active",
    salary: salaryOf(s),
    bank: bank ? { routingCode: DEMO_ROUTING, ibanLast4: "3456" } : null,
    iban: bank ? IBAN_SENTINEL : null,
    labourPersonId: `1000000000${String(n).padStart(4, "0")}`,
    emiratesIdNumber: `784199${String(n).padStart(9, "0")}`,
  };
}
