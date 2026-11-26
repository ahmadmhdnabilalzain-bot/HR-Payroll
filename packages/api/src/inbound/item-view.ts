import type { InboundItem } from "@payroll/contract";
import { channelSealer } from "../channels/crypto";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

export interface ItemRow {
  id: string;
  status: InboundItem["status"];
  received_at: string;
  from_enc: string | null;
  matched_employee_id: string | null;
  content_enc: string | null;
  auth: InboundItem["auth"];
  flags: InboundItem["flags"];
  reject_reason: InboundItem["rejectReason"];
  decision: InboundItem["decision"];
}

export interface AttachmentRow {
  id: string;
  idx: number;
  file_name: string;
  content_type: string | null;
  size: number;
  blob_key: string | null;
  status: "kept" | "skipped";
  skip: InboundItem["attachments"][number]["skip"];
}

const ITEM = `SELECT id, status, received_at, from_enc, matched_employee_id,
  content_enc, auth, array_to_json(flags) AS flags, reject_reason, decision
  FROM inbound_items`;

export async function lockItem(tx: Db, c: string, id: string, lock = true)
  : Promise<ItemRow> {
  const [r] = await tx.query<ItemRow>(`${ITEM} WHERE company_id = $1
    AND id = $2 ${lock ? "FOR UPDATE" : ""}`, [c, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

export function attachmentsOf(tx: Db, c: string, itemId: string)
  : Promise<AttachmentRow[]> {
  return tx.query<AttachmentRow>(
    `SELECT * FROM inbound_attachments WHERE company_id = $1
       AND item_id = $2 ORDER BY idx`, [c, itemId]);
}

async function employeeName(ctx: ReqCtx, id: string | null) {
  if (id === null) return null;
  const [e] = await ctx.tx.query<{ full_name: string }>(
    "SELECT full_name FROM employees WHERE company_id = $1 AND id = $2",
    [ctx.tenant!.companyId, id]);
  return e === undefined ? null : { employeeId: id, name: e.full_name };
}

/** The review view; rejected items show no sender, subject or text. */
export async function itemView(ctx: ReqCtx, r: ItemRow)
  : Promise<InboundItem> {
  const c = ctx.tenant!.companyId;
  const s = await channelSealer(ctx.tx, ctx.deps, c);
  const open = (col: string, v: string | null) => v === null ? null
    : s.open("inbound_items", col, r.id, v);
  const content = JSON.parse(open("content", r.content_enc) ??
    '{"subject":"","text":""}') as { subject: string; text: string };
  return { id: r.id, status: r.status, receivedAt: r.received_at,
    fromAddress: open("from", r.from_enc),
    matchedEmployee: await employeeName(ctx, r.matched_employee_id),
    subject: content.subject, textPreview: content.text, auth: r.auth,
    flags: r.flags ?? [], rejectReason: r.reject_reason,
    decision: r.decision,
    attachments: (await attachmentsOf(ctx.tx, c, r.id)).map((a) => ({
      index: a.idx, fileName: a.file_name,
      contentType: a.content_type as InboundItem["attachments"][number][
        "contentType"], size: a.size, status: a.status, skip: a.skip })) };
}

export async function getItem(ctx: ReqCtx<unknown, unknown, { id: string }>)
  : Promise<InboundItem> {
  return itemView(ctx, await lockItem(ctx.tx, ctx.tenant!.companyId,
    ctx.params.id, false));
}

export async function listItems(ctx: ReqCtx<unknown, { status?: string;
  before?: string; limit?: number }>) {
  const q = ctx.query;
  const rows = await ctx.tx.query<ItemRow>(`${ITEM} WHERE company_id = $1
    AND ($2::text IS NULL OR status = $2)
    AND ($3::timestamptz IS NULL OR received_at < $3)
    ORDER BY received_at DESC, id DESC LIMIT $4`,
  [ctx.tenant!.companyId, q.status ?? null, q.before ?? null,
    q.limit ?? 50]);
  const items: InboundItem[] = [];
  for (const r of rows) items.push(await itemView(ctx, r));
  return { items };
}
