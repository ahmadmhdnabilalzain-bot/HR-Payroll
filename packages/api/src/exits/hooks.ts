import type { DocumentKind, DocumentsRequest } from "@payroll/contract";
import { auditFor } from "../audit/hr-audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import type { DocumentResult } from "../ports/documents";
import { addRun } from "./hook-runs";
import type { ExitRow } from "./exit-rows";
import { exitView, visibleExit } from "./exits";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;

/** Ports run in the handler's transaction; a throw is "failed". */
async function generate(ctx: IdCtx<DocumentsRequest>, x: ExitRow,
  kind: DocumentKind) {
  let out: DocumentResult | { status: "failed" };
  try {
    out = await ctx.deps.documents.generate({ companyId: co(ctx),
      exitId: x.id, employeeId: x.employeeId, kind, lang: ctx.body.lang });
  } catch {
    out = { status: "failed" };
  }
  const ref = out.status === "generated" ? out.documentRef : null;
  await addRun(ctx, x.id, "documents", { kind, status: out.status, ref });
  return out.status;
}

/**
 * Experience certificate and settlement statement through the
 * document port (ids only). Needs an approved or closed exit; the
 * statement needs a computed settlement.
 */
export async function generateDocuments(ctx: IdCtx<DocumentsRequest>) {
  const x = await visibleExit(ctx, true);
  if (x.status !== "in-notice" && x.status !== "closed") {
    throw new ApiError("EXIT_NOT_APPROVED");
  }
  const kinds = [...new Set(ctx.body.kinds)];
  if (kinds.includes("settlement-statement") &&
    x.settlement?.settlement.status !== "computed") {
    throw new ApiError("SETTLEMENT_REQUIRED");
  }
  const statuses: string[] = [];
  for (const k of kinds) statuses.push(await generate(ctx, x, k));
  await auditFor(ctx, "exit", "exit.documents-requested", x.id,
    { kinds, statuses });
  return exitView(ctx, x.id);
}
