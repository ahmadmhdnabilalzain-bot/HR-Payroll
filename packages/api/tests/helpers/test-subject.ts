import type { ApprovalView, SubjectType } from "@payroll/contract";
import { fils } from "@payroll/engine";
import { openRequest } from "../../src/approvals/requests";
import {
  employeeUsers,
  type SubjectHandler,
} from "../../src/approvals/subjects";
import type { Db } from "../../src/db/db";
import { toMoney } from "../../src/db/money";
import { withTenant } from "../../src/db/tenant";
import type { AppDeps } from "../../src/deps";
import type { ReqCtx } from "../../src/http/context";

/**
 * A subject for testing the approval spine without expenses: a tenant
 * table `test_subjects` with RLS forced, a company policy and the same
 * grants as every tenant table.
 */
export async function installTestSubjects(admin: Db): Promise<void> {
  await admin.exec(`
    CREATE TABLE test_subjects (
      id uuid PRIMARY KEY,
      company_id uuid NOT NULL REFERENCES companies (id),
      employee_id uuid NOT NULL,
      total bigint NOT NULL,
      status text NOT NULL DEFAULT 'open');
    ALTER TABLE test_subjects ENABLE ROW LEVEL SECURITY;
    ALTER TABLE test_subjects FORCE ROW LEVEL SECURITY;
    CREATE POLICY test_subjects_tenant ON test_subjects
      USING (company_id = app_company_id())
      WITH CHECK (company_id = app_company_id());
    GRANT SELECT, INSERT, UPDATE ON test_subjects TO payroll_app;`);
}

interface Row { employee_id: string; total: bigint; full_name: string }

export interface TestSubjects {
  handler: SubjectHandler;
  outcomes: { subjectId: string; outcome: string }[];
}

async function rowOf(tx: Db, companyId: string, id: string) {
  const [r] = await tx.query<Row>(
    `SELECT t.employee_id, t.total, e.full_name FROM test_subjects t
     JOIN employees e ON e.company_id = t.company_id
       AND e.id = t.employee_id
     WHERE t.company_id = $1 AND t.id = $2`, [companyId, id]);
  if (r === undefined) throw new Error("no test subject");
  return r;
}

export function testSubjects(type: SubjectType = "expense-claim")
  : TestSubjects {
  const outcomes: TestSubjects["outcomes"] = [];
  const handler: SubjectHandler = {
    type,
    async facts(tx, companyId, id) {
      const r = await rowOf(tx, companyId, id);
      const users = await employeeUsers(tx, companyId, r.employee_id);
      return { claimantEmployeeId: r.employee_id, ...users,
        total: fils(BigInt(r.total)), overLimit: false,
        summary: { employeeName: r.full_name, title: "Test subject",
          total: toMoney(fils(BigInt(r.total))), flagCodes: [] } };
    },
    async canView(ctx, id) {
      const t = ctx.tenant!;
      if (t.role === "owner" || t.role === "hr") return true;
      const r = await rowOf(ctx.tx, t.companyId, id);
      const u = await employeeUsers(ctx.tx, t.companyId, r.employee_id);
      return [u.claimantUserId, u.lineManagerUserId]
        .includes(ctx.user!.id);
    },
    async onClosed(ctx, id, outcome) {
      await ctx.tx.query(
        "UPDATE test_subjects SET status = $3 WHERE company_id = $1 " +
        "AND id = $2", [ctx.tenant!.companyId, id, outcome]);
      outcomes.push({ subjectId: id, outcome });
    },
  };
  return { handler, outcomes };
}

let n = 0;

/** A subject row for `employeeId` with `total` in fils. */
export async function addSubject(db: Db, companyId: string,
  employeeId: string, total: bigint): Promise<string> {
  const id = `00000000-0000-4000-9000-${(++n).toString(16)
    .padStart(12, "0")}`;
  await db.query(
    `INSERT INTO test_subjects (id, company_id, employee_id, total)
     VALUES ($1, $2, $3, $4)`, [id, companyId, employeeId, total]);
  return id;
}

/** Opens an approval request as `userId` (the submitter). */
export function openFor(deps: AppDeps, s: TestSubjects, companyId: string,
  userId: string, subjectId: string): Promise<ApprovalView> {
  return withTenant(deps.db, { companyId, userId }, async (tx) => {
    const [m] = await tx.query<{ role: "owner" }>(
      "SELECT role FROM memberships WHERE company_id = $1 AND user_id = $2",
      [companyId, userId]);
    const ctx = { tx, deps, user: { id: userId },
      tenant: { companyId, role: m!.role, employeeId: null } };
    return openRequest(ctx as unknown as ReqCtx,
      new Map([[s.handler.type, s.handler]]), s.handler.type, subjectId,
      userId);
  });
}
