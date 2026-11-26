import { fils } from "@payroll/engine";
import {
  letters,
  staffRequests,
  visaCases,
  warnings,
  type DemoCompany,
} from "@payroll/demo-data";
import type { Nationalities, PapersData } from "./papers-types";

/**
 * The People papers view over the demo company. Imported only by
 * adapter.ts, so the package stays in the lazy chunk.
 */
const REGION = new Intl.DisplayNames(["en"], { type: "region" });

function nationalitiesOf(c: DemoCompany): Nationalities {
  const n = c.nationalities;
  return { asOf: n.asOf, label: n.label, headcount: n.headcount,
    uaeNationals: n.uaeNationals,
    rows: n.byNationality.map((r) => ({
      name: REGION.of(r.nationality) ?? r.nationality, count: r.count })) };
}

export function adaptPapers(c: DemoCompany): PapersData {
  const ls = letters(c).map((l) => ({ id: l.id, kind: l.kind,
    employeeId: l.employeeId, requestedOn: l.requestedOn, base: l.status,
    purpose: l.purpose, addressee: l.addressee,
    reference: l.reference.masked, monthlySalary: l.monthlySalary }));
  const rs = staffRequests(c).map((r) => ({ id: r.id, kind: r.kind,
    title: r.title, employeeId: r.employeeId, raisedOn: r.raisedOn,
    base: r.status, assignedToId: r.assignedTo, linksTo: r.linksTo }));
  const vs = visaCases(c).map((v) => ({ id: v.id,
    employeeId: v.employeeId, kind: v.kind, expiresOn: v.expiresOn,
    base: v.status, feesNote: v.feesNote,
    stages: v.stages.map((s) => ({ label: s.label, date: s.date,
      done: s.done })) }));
  const ws = warnings(c).map((w) => ({ id: w.id, employeeId: w.employeeId,
    level: w.level, reason: w.reason, base: w.status,
    issuedById: w.issuedBy, evidence: w.evidence.map((e) => e.iso),
    deductionNote: w.deductionNote }));
  const nat = nationalitiesOf(c);
  return { asOf: c.asOf, letters: () => ls, requests: () => rs,
    visas: () => vs, warnings: () => ws, nationalities: () => nat,
    contractSalary: (id) => {
      const e = c.employees.find((x) => x.id === id);
      return e === undefined ? null : fils(e.basicMonthly +
        e.allowances.reduce((n, a) => n + a.monthly, 0n));
    },
    queueOwnerId: rs[0]?.assignedToId ?? "" };
}
