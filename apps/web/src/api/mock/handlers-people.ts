import { toWireEmployee, type WireEmployee } from "../contract";
import { param, signedIn, type Ctx, type Handler } from "./context";
import { notFound } from "./fail";
import type { MockEmployee } from "./seed-types";
import { record } from "./state";

const PAYROLL_ROLES: readonly string[] = ["owner", "hr"];

/** Owner and hr see everyone; a manager their reports; others self. */
export function visibleEmployees(c: Ctx): MockEmployee[] {
  const u = signedIn(c);
  if (PAYROLL_ROLES.includes(u.role)) return c.s.employees;
  if (u.role === "manager") {
    return c.s.employees.filter((e) => e.managerId === u.employeeId &&
      u.employeeId !== null);
  }
  return c.s.employees.filter((e) => e.id === u.employeeId);
}

/** Protected fields are null for roles that may not see them. */
function view(c: Ctx, e: MockEmployee): WireEmployee {
  const { iban: _hidden, ...rest } = e;
  const full = toWireEmployee(rest);
  if (PAYROLL_ROLES.includes(signedIn(c).role)) return full;
  return { ...full, salary: null, bank: null, labourPersonId: null,
    emiratesIdNumber: null };
}

export function findVisible(c: Ctx, id: string): MockEmployee {
  const e = visibleEmployees(c).find((x) => x.id === id);
  if (e === undefined) throw notFound("employee");
  return e;
}

function revealBank(c: Ctx, id: string) {
  const e = findVisible(c, id);
  if (e.iban === null || e.bank === null) throw notFound("bank details");
  record(c.s, signedIn(c), { at: c.now, action: "employee.bank.revealed",
    entityType: "employee", entityId: e.id, data: {} });
  return { routingCode: e.bank.routingCode, iban: e.iban };
}

export const PEOPLE_HANDLERS = {
  listDepartments: (c) => ({ items: c.s.departments }),
  listEmployees: (c) => ({ items: visibleEmployees(c)
    .map((e) => view(c, e)) }),
  getEmployee: (c, r) => view(c, findVisible(c, param(r))),
  revealBank: (c, r) => revealBank(c, param(r)),
} satisfies Record<string, Handler>;
