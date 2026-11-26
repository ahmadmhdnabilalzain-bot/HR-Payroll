import { createHash } from "node:crypto";
import { RECEIPT_MAX_BYTES, type AttachmentSkip } from "@payroll/contract";
import { channelAudit } from "../channels/audit";
import { channelSealer, type ChannelSealer } from "../channels/crypto";
import { emitEvent } from "../channels/events";
import type { EventCtx } from "../channels/notify";
import type { InboundAttachment, InboundEmail } from "../channels/ports";
import { sniffContentType } from "../receipts/sniff";

/** At most this many attachments are kept per message. */
const MAX_ATTACHMENTS = 10;

const authOf = (e: InboundEmail) =>
  ({ spf: e.auth.spf, dkim: e.auth.dkim, dmarc: e.auth.dmarc });

/** A rejected item: status, reason, auth results and time only. */
export async function rejectItem(c: EventCtx, e: InboundEmail,
  reason: string): Promise<void> {
  await c.tx.query(
    `INSERT INTO inbound_items (id, company_id, status, received_at,
       message_id, auth, reject_reason)
     VALUES ($1, $2, 'rejected', $3, $4, $5, $6)`,
    [c.deps.newId(), c.companyId, c.deps.now().toISOString(),
      createHash("sha256").update(e.messageId).digest("hex"),
      JSON.stringify(authOf(e)), reason]);
}

function skipOf(a: InboundAttachment, idx: number): AttachmentSkip | null {
  if (idx >= MAX_ATTACHMENTS) return "TOO_MANY";
  if (a.bytes.length > RECEIPT_MAX_BYTES) return "TOO_LARGE";
  const sniffed = sniffContentType(a.bytes);
  if (sniffed === null) return "TYPE_NOT_ALLOWED";
  const declared = a.contentType.split(";")[0]!.trim().toLowerCase();
  return sniffed === declared ? null : "TYPE_MISMATCH";
}

/** Registers an undo that runs only if the request fails (M7). */
export type OnFailure = (undo: () => Promise<void>) => void;

async function storeAttachment(c: EventCtx, s: ChannelSealer,
  itemId: string, a: InboundAttachment, idx: number,
  onFailure: OnFailure): Promise<boolean> {
  const id = c.deps.newId();
  const skip = skipOf(a, idx);
  const name = a.name.replace(/[\u0000-\u001f\u007f/\\]/g, "")
    .slice(0, 255) || "attachment";
  let key: string | null = null;
  if (skip === null) {
    key = `${c.companyId}/inbound/${id}`;
    const cipher = s.seal("inbound", "content", id,
      Buffer.from(a.bytes).toString("base64"));
    const k = key;
    onFailure(() => c.deps.blobs.delete(k));
    await c.deps.blobs.put(key, new TextEncoder().encode(cipher));
  }
  await c.tx.query(
    `INSERT INTO inbound_attachments (id, company_id, item_id, idx,
       file_name, content_type, size, sha256, blob_key, status, skip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [id, c.companyId, itemId, idx, name, skip === null
      ? sniffContentType(a.bytes) : null, a.bytes.length,
    skip === null ? createHash("sha256").update(a.bytes).digest("hex")
      : null, key, skip === null ? "kept" : "skipped", skip]);
  return skip === null;
}

/** A received item for review, with its attachments checked one by one. */
export async function keepItem(c: EventCtx, e: InboundEmail,
  employeeId: string | null, unverified: boolean, onFailure: OnFailure)
  : Promise<void> {
  const id = c.deps.newId();
  const s = await channelSealer(c.tx, c.deps, c.companyId);
  const seal = (col: string, v: string) => s.seal("inbound_items", col, id, v);
  await c.tx.query(
    `INSERT INTO inbound_items (id, company_id, status, received_at,
       message_id, from_enc, matched_employee_id, content_enc, auth)
     VALUES ($1, $2, 'received', $3, $4, $5, $6, $7, $8)`,
    [id, c.companyId, c.deps.now().toISOString(),
      createHash("sha256").update(e.messageId).digest("hex"),
      seal("from", e.from.toLowerCase()), employeeId,
      seal("content", JSON.stringify({ subject: e.subject.slice(0, 200),
        text: e.text.slice(0, 1000) })), JSON.stringify(authOf(e))]);
  let kept = 0;
  for (const [i, a] of e.attachments.entries()) {
    if (await storeAttachment(c, s, id, a, i, onFailure)) kept += 1;
  }
  const flags = [...(unverified ? ["SENDER_UNVERIFIED"] : []),
    ...(kept < e.attachments.length ? ["ATTACHMENT_SKIPPED"] : [])];
  await c.tx.query("UPDATE inbound_items SET flags = $3 WHERE " +
    "company_id = $1 AND id = $2", [c.companyId, id, `{${flags.join(",")}}`]);
  await emitEvent(c, { type: "inbound.received", itemId: id });
  await channelAudit(c.tx, { companyId: c.companyId,
    at: c.deps.now().toISOString(), actorUserId: null,
    action: "inbound.received", entityType: "inbound-item", entityId: id,
    data: { attachmentCount: e.attachments.length, keptCount: kept,
      flags } });
}
