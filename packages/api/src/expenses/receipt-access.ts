import type { ReqCtx } from "../http/context";
import { viewer, VISIBLE } from "./claim-view";

/**
 * A receipt is also visible to anyone who may view a claim whose
 * current revision uses it (the approver sees what they approve).
 */
export async function claimReceiptViewer(ctx: ReqCtx, receiptId: string)
  : Promise<boolean> {
  const rows = await ctx.tx.query(
    `SELECT 1 FROM expense_item_receipts x
     JOIN expense_items i ON i.company_id = x.company_id AND i.id = x.item_id
     JOIN expense_claims c ON c.company_id = i.company_id
       AND c.id = i.claim_id AND c.revision = i.revision
     JOIN employees e ON e.company_id = c.company_id AND e.id = c.employee_id
     WHERE x.company_id = $4 AND x.receipt_id = $5 AND ${VISIBLE}
     LIMIT 1`, [...viewer(ctx), ctx.tenant!.companyId, receiptId]);
  return rows.length > 0;
}
