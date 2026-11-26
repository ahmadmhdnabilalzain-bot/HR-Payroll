import type { AccessResult, Exit } from "@payroll/contract";
import type { Db } from "../db/db";
import { dubaiDate } from "../time/dubai";
import { leaverLogins, stillActive } from "./leaver-logins";

interface RunRow {
  kind: string;
  status: string;
  ref: string | null;
  at: string;
}

async function runs(tx: Db, companyId: string, exitId: string,
  hook: "documents" | "access"): Promise<RunRow[]> {
  return tx.query<RunRow>(
    `SELECT kind, status, ref, at FROM exit_hook_runs WHERE company_id = $1
     AND exit_id = $2 AND hook = $3 ORDER BY at, kind, id`,
    [companyId, exitId, hook]);
}

/** The stored access revocation of an exit, or null if never run. */
export async function storedAccess(tx: Db, companyId: string,
  x: { id: string; lastWorkingDate: string }): Promise<AccessResult | null> {
  const rs = await runs(tx, companyId, x.id, "access");
  const inApp = rs.find((r) => r.kind === "in-app");
  const external = rs.find((r) => r.kind === "external");
  if (inApp === undefined || external === undefined) return null;
  return { inApp: inApp.status as AccessResult["inApp"],
    external: external.status as AccessResult["external"],
    beforeLastDay: dubaiDate(new Date(inApp.at)) < x.lastWorkingDate,
    at: inApp.at };
}

/**
 * The leaver's in-app access, read live: "not-revoked" while any login
 * that may be theirs (linked, or same email, not confirmed as someone
 * else's) is active, even after a revocation ran; else the stored
 * result; else "no-login" (review C-1, I-1).
 */
export async function exitAccess(tx: Db, companyId: string,
  x: { id: string; employeeId: string; lastWorkingDate: string }):
  Promise<Exit["access"]> {
  const logins = await leaverLogins(tx, companyId, x);
  const done = await storedAccess(tx, companyId, x);
  if (stillActive(logins).length > 0) {
    return { status: "not-revoked", at: done?.at ?? null, logins };
  }
  if (done !== null) return { status: done.inApp, at: done.at, logins };
  return { status: "no-login", at: null, logins };
}

/** Every document hook run of the exit, oldest first. */
export async function exitDocuments(tx: Db, companyId: string,
  exitId: string): Promise<Exit["documents"]> {
  const rs = await runs(tx, companyId, exitId, "documents");
  return rs.map((r) => ({ kind: r.kind as Exit["documents"][0]["kind"],
    status: r.status as Exit["documents"][0]["status"],
    documentRef: r.ref, at: r.at }));
}
