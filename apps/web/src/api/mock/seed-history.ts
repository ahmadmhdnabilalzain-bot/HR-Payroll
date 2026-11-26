import { add, fils, type Fils } from "@payroll/engine";
import {
  NOT_COMPUTED_PAY,
  toWirePayRunCreate,
  type AppPayRun,
  type AppPayslip,
  type AuditEvent,
} from "../contract";
import { nextEvent, type AuditInput } from "./audit";
import {
  dubaiAt,
  periodEnd,
  periodOf,
  periodStart,
  shiftPeriod,
} from "./dates";
import { computeRun } from "./pay";
import { canonical, sha256 } from "./sha256";
import { buildSif } from "./sif";
import { KIND, uid, type MockSeed } from "./seed-types";

const OWNER = uid(KIND.user, 1);
const OWNER2 = uid(KIND.user, 2);

function lastMonthRun(s: MockSeed, today: string) {
  const period = shiftPeriod(periodOf(today), -1);
  const body = { period, entries: [] };
  const drafts = computeRun({ period, employees: s.employees,
    leave: s.leave, leaveTypes: s.leaveTypes, body });
  const runId = uid(KIND.run, 1);
  const payslips: AppPayslip[] = drafts.map((d, i) => ({ ...d,
    id: uid(KIND.payslip, i + 1), payRunId: runId }));
  const gross = payslips.reduce((t: Fils, p) => add(t, p.gross), fils(0n));
  const end = periodEnd(period);
  const run: AppPayRun = {
    id: runId, period, status: "approved", createdBy: OWNER,
    approvedBy: OWNER2, createdAt: dubaiAt(end, 9, 0),
    approvedAt: dubaiAt(end, 15, 0),
    inputHash: sha256(canonical(toWirePayRunCreate(body))),
    employeeCount: payslips.length, gross, sifFileId: null,
    notComputed: [...NOT_COMPUTED_PAY],
  };
  return { run, payslips };
}

function chain(inputs: AuditInput[]): AuditEvent[] {
  const out: AuditEvent[] = [];
  for (const input of inputs) {
    out.push(nextEvent(out, input, uid(KIND.audit, out.length + 1)));
  }
  return out;
}

const ev = (
  at: string, actor: string, action: string, entityType: string,
  entityId: string, data: AuditInput["data"] = {},
): AuditInput => ({ at, actorUserId: actor, action, entityType, entityId,
  data });

/**
 * Last month's run, created by one owner and approved by the other,
 * its salary file, and the audit events those writes left.
 */
export function seedHistory(
  s: MockSeed,
  today: string,
  withRun: boolean,
): MockSeed {
  const founded = `${Number(today.slice(0, 4)) - 1}-01-04`;
  const created = ev(dubaiAt(founded, 10, 0), OWNER, "company.created",
    "company", s.company.id);
  if (!withRun || s.employees.length === 0) {
    return { ...s, audit: chain([created]) };
  }
  const { run, payslips } = lastMonthRun(s, today);
  const fileDate = periodStart(periodOf(today));
  const sif = buildSif({ id: uid(KIND.sif, 1), payRunId: run.id,
    company: s.company, slips: payslips, employees: s.employees,
    createdDate: fileDate, createdTime: "103000",
    createdAt: dubaiAt(fileDate, 10, 30), today });
  const audit = chain([
    created,
    ev(run.createdAt, OWNER, "payroll.run-created", "pay-run", run.id),
    ev(run.approvedAt ?? run.createdAt, OWNER2, "payroll.run-approved",
      "pay-run", run.id),
    ev(sif.file.createdAt, OWNER2, "sif.generated", "sif-file",
      sif.file.id, { fileName: sif.file.fileName,
        errorCount: sif.file.errorCount,
        warningCount: sif.file.warningCount }),
  ]);
  return { ...s, runs: [run], payslips, sifs: [sif], audit };
}
