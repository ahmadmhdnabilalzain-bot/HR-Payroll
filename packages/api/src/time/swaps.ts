import type { SwapCreate, SwapRequest } from "@payroll/contract";
import type { Tenant } from "../auth/guard";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { leaveMap } from "./leave-map";
import { rosterFlagsFor } from "./roster-flags";
import { publishedSlotOn, readEntries, type EntryRow } from "./rosters";
import { employeeRefs } from "./roster-write";

export interface SwapRow { id: string; requester_employee_id: string;
  date: string; peer_employee_id: string; peer_date: string;
  status: SwapRequest["status"]; requester_version: number;
  peer_version: number; requested_by: string; decided_by: string | null;
  decided_at: string | null; created_at: string }

export async function loadSwap(tx: Db, companyId: string, id: string,
  lock = false): Promise<SwapRow> {
  const [r] = await tx.query<SwapRow>(
    `SELECT * FROM swap_requests WHERE company_id = $1 AND id = $2
     ${lock ? "FOR UPDATE" : ""}`, [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

/** Parties, a manager of either, hr and owner; others 404. */
export async function canSeeSwap(tx: Db, t: Tenant, r: SwapRow) {
  if (t.role === "owner" || t.role === "hr") return true;
  const parties = [r.requester_employee_id, r.peer_employee_id];
  if (t.employeeId !== null && parties.includes(t.employeeId)) return true;
  if (t.role !== "manager") return false;
  const refs = await employeeRefs(tx, t.companyId, parties);
  return refs.some((x) => x.manager_id === t.employeeId);
}

export async function visibleSwap(tx: Db, t: Tenant, id: string,
  lock = false): Promise<SwapRow> {
  const r = await loadSwap(tx, t.companyId, id, lock);
  if (!(await canSeeSwap(tx, t, r))) throw new ApiError("NOT_FOUND");
  return r;
}

const PENDING = ["pending-peer", "pending-approval"];

/** Current published slots; an approved swap shows them reversed. */
export async function toSwap(tx: Db, companyId: string, r: SwapRow)
  : Promise<SwapRequest> {
  const a = await publishedSlotOn(tx, companyId, r.requester_employee_id,
    r.date);
  const b = await publishedSlotOn(tx, companyId, r.peer_employee_id,
    r.peer_date);
  const [mine, theirs] = r.status === "approved" ? [b, a] : [a, b];
  const rest = { kind: "rest" } as const;
  const flagsAfter = !PENDING.includes(r.status) ? [] : await rosterFlagsFor(
    tx, companyId, [r.requester_employee_id, r.peer_employee_id],
    r.date < r.peer_date ? r.date : r.peer_date,
    r.date > r.peer_date ? r.date : r.peer_date, new Map([
      [`${r.requester_employee_id}|${r.date}`, theirs.slot],
      [`${r.peer_employee_id}|${r.peer_date}`, mine.slot]]));
  return { id: r.id, requesterEmployeeId: r.requester_employee_id,
    date: r.date, peerEmployeeId: r.peer_employee_id,
    peerDate: r.peer_date, status: r.status,
    requesterSlot: mine.slot ?? rest, peerSlot: theirs.slot ?? rest,
    flagsAfter, decidedBy: r.decided_by, decidedAt: r.decided_at,
    createdAt: r.created_at };
}

async function onLeave(tx: Db, companyId: string, emp: string,
  date: string) {
  const m = await leaveMap(tx, companyId, [emp], date, date);
  return m.get(emp)?.has(date) === true;
}

/** Validates a new request; returns both stored versions. */
export async function checkNewSwap(tx: Db, t: Tenant, me: string,
  b: SwapCreate, today: string) {
  const peerDate = b.withDate ?? b.date;
  if (b.withEmployeeId === me) throw new ApiError("SWAP_SELF");
  if ((await employeeRefs(tx, t.companyId, [b.withEmployeeId])).length
    === 0) throw new ApiError("NOT_FOUND");
  if (b.date < today || peerDate < today) {
    throw new ApiError("SWAP_IN_PAST");
  }
  await tx.query("SELECT 1 FROM employees WHERE company_id = $1 AND id = " +
    "ANY($2::uuid[]) FOR UPDATE", [t.companyId, [me, b.withEmployeeId]]);
  const a = await publishedSlotOn(tx, t.companyId, me, b.date);
  const p = await publishedSlotOn(tx, t.companyId, b.withEmployeeId,
    peerDate);
  if (a.slot === null || p.slot === null) {
    throw new ApiError("SWAP_NO_PUBLISHED_ENTRY");
  }
  if (await onLeave(tx, t.companyId, me, b.date) ||
    await onLeave(tx, t.companyId, b.withEmployeeId, peerDate)) {
    throw new ApiError("SWAP_ON_LEAVE");
  }
  return { peerDate, mine: a.version, theirs: p.version };
}

/** Writes `src`'s draft and published slot onto one day. */
async function writeFrom(tx: Db, companyId: string, emp: string,
  date: string, src: EntryRow) {
  await tx.query(
    `UPDATE roster_entries SET draft_kind = $4,
       draft_shift_template_id = $5, published_kind = $6,
       published_template_id = $7, published_start_min = $8,
       published_end_min = $9, published_break_minutes = $10,
       version = version + 1
     WHERE company_id = $1 AND employee_id = $2 AND date = $3`,
    [companyId, emp, date, src.draft_kind, src.draft_shift_template_id,
      src.published_kind, src.published_template_id,
      src.published_start_min, src.published_end_min,
      src.published_break_minutes]);
}

/** Exchanges both draft and published slots; versions must match. */
export async function applySwap(tx: Db, companyId: string, r: SwapRow) {
  const [a] = await readEntries(tx, companyId, [r.requester_employee_id],
    r.date, r.date, true);
  const [b] = await readEntries(tx, companyId, [r.peer_employee_id],
    r.peer_date, r.peer_date, true);
  if (a === undefined || b === undefined ||
    a.version !== r.requester_version || b.version !== r.peer_version) {
    throw new ApiError("SWAP_ENTRY_CHANGED");
  }
  await writeFrom(tx, companyId, r.requester_employee_id, r.date, b);
  await writeFrom(tx, companyId, r.peer_employee_id, r.peer_date, a);
}
