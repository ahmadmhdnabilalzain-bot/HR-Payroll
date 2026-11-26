import type {
  ExpenseClaimCreate,
  InboundAccept,
  InboundDismiss,
  InboundItem,
} from "@payroll/contract";
import { channelAudit } from "../channels/audit";
import { channelSealer } from "../channels/crypto";
import { createClaim } from "../expenses/claims";
import { BinaryReply, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { storeReceiptBytes } from "../receipts/receipts";
import {
  attachmentsOf,
  itemView,
  lockItem,
  type AttachmentRow,
} from "./item-view";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

async function keptBytes(ctx: ReqCtx, a: AttachmentRow): Promise<Uint8Array> {
  const blob = await ctx.deps.blobs.get(a.blob_key!);
  if (blob === null) throw new ApiError("NOT_FOUND");
  const s = await channelSealer(ctx.tx, ctx.deps, ctx.tenant!.companyId);
  const b64 = s.open("inbound", "content", a.id,
    new TextDecoder().decode(blob));
  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function decideItem(ctx: IdCtx, as: string, receiptIds: string[],
  claimId: string | null, status: "accepted" | "dismissed") {
  const at = ctx.deps.now().toISOString();
  const decision = { by: ctx.user!.id, at, as, receiptIds, claimId };
  await ctx.tx.query(
    `UPDATE inbound_items SET status = $3, decided_by = $4, decided_at = $5,
       decision = $6 WHERE company_id = $1 AND id = $2`,
    [ctx.tenant!.companyId, ctx.params.id, status, ctx.user!.id, at,
      JSON.stringify(decision)]);
}

async function pending(ctx: IdCtx) {
  const r = await lockItem(ctx.tx, ctx.tenant!.companyId, ctx.params.id);
  if (r.status !== "received") throw new ApiError("INBOUND_NOT_PENDING");
  return r;
}

async function employeeExists(ctx: ReqCtx, id: string): Promise<void> {
  const rows = await ctx.tx.query("SELECT 1 FROM employees WHERE " +
    "company_id = $1 AND id = $2", [ctx.tenant!.companyId, id]);
  if (rows.length === 0) throw new ApiError("NOT_FOUND");
}

/**
 * A person files kept attachments as receipts of an employee (Plan 6
 * checks run again), optionally with an empty draft claim. Nothing is
 * submitted or approved here.
 */
export async function acceptItem(ctx: IdCtx<InboundAccept>)
  : Promise<InboundItem> {
  const b = ctx.body;
  const item = await pending(ctx);
  await employeeExists(ctx, b.employeeId);
  const atts = await attachmentsOf(ctx.tx, ctx.tenant!.companyId, item.id);
  const chosen = b.attachmentIndexes.map((i) => atts.find((a) =>
    a.idx === i && a.status === "kept"));
  if (chosen.some((a) => a === undefined)) {
    throw new ApiError("INBOUND_ATTACHMENT_NOT_KEPT");
  }
  const receiptIds: string[] = [];
  for (const a of chosen as AttachmentRow[]) {
    const r = await storeReceiptBytes(ctx, b.employeeId, a.file_name,
      await keptBytes(ctx, a));
    receiptIds.push(r.id);
  }
  const claimId = b.as === "claim-draft" ? (await createClaim({ ...ctx,
    body: { employeeId: b.employeeId, title: b.title!, items: [] } } as
    ReqCtx<ExpenseClaimCreate>)).id : null;
  await decideItem(ctx, b.as, receiptIds, claimId, "accepted");
  await auditItem(ctx, "inbound.accepted", { as: b.as,
    receiptCount: receiptIds.length });
  return itemView(ctx, await lockItem(ctx.tx, ctx.tenant!.companyId,
    item.id));
}

export async function dismissItem(ctx: IdCtx<InboundDismiss>)
  : Promise<InboundItem> {
  const item = await pending(ctx);
  await decideItem(ctx, "dismissed", [], null, "dismissed");
  await auditItem(ctx, "inbound.dismissed",
    { dismissReason: ctx.body.reason });
  return itemView(ctx, await lockItem(ctx.tx, ctx.tenant!.companyId,
    item.id));
}

async function auditItem(ctx: IdCtx, action: string,
  data: Record<string, unknown>) {
  await channelAudit(ctx.tx, { companyId: ctx.tenant!.companyId,
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id, action,
    entityType: "inbound-item", entityId: ctx.params.id,
    data: data as never });
}

const EXT: Record<string, string> = { "image/jpeg": "jpg",
  "image/png": "png", "application/pdf": "pdf" };

/** The decrypted bytes of a kept attachment, never shown inline. */
export async function downloadAttachment(ctx: ReqCtx<unknown, unknown,
  { id: string; index: number }>): Promise<BinaryReply> {
  const c = ctx.tenant!.companyId;
  await lockItem(ctx.tx, c, ctx.params.id, false);
  const a = (await attachmentsOf(ctx.tx, c, ctx.params.id)).find((x) =>
    x.idx === ctx.params.index && x.status === "kept");
  if (a === undefined) throw new ApiError("NOT_FOUND");
  return new BinaryReply(await keptBytes(ctx, a), a.content_type!,
    `inbound-${ctx.params.id}-${a.idx}.${EXT[a.content_type!] ?? "bin"}`);
}
