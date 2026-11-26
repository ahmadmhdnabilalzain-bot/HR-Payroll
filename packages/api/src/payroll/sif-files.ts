import { SIF_STATEMENT, type Finding, type SifFile } from "@payroll/contract";
import { EngineError, fils } from "@payroll/engine";
import { defaultLayout, generateSif, validateSif } from "@payroll/wps";
import { appendAudit } from "../audit/audit";
import { looksSensitive } from "../audit/allowlist";
import type { Db } from "../db/db";
import { toMoney } from "../db/money";
import { FileReply, Reply, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { sealerFor } from "../people/employees";
import { dubaiDate } from "../time/dubai";
import { loadRun } from "./pay-runs";
import { bankDrift, loadSifBatch } from "./sif";

interface SifRow {
  id: string;
  pay_run_id: string;
  file_name: string;
  total: bigint;
  text_enc: string;
  findings_enc: string;
  error_count: number;
  warning_count: number;
  created_at: string;
  bank_drift: string[];
}

/**
 * A finding's value quotes the file (an IBAN, a labour id, an amount);
 * the metadata route needs no MFA, so such values are hidden there.
 */
function shown(f: Finding): Finding {
  return looksSensitive(f.value) ? { ...f, value: "(hidden)" } : f;
}

async function toSifFile(tx: Db, ctx: ReqCtx, r: SifRow): Promise<SifFile> {
  const s = await sealerFor(tx, ctx.deps, ctx.tenant!.companyId,
    "sif_files");
  const findings = JSON.parse(s.open("findings_enc", r.id,
    r.findings_enc)!) as Finding[];
  return { id: r.id, payRunId: r.pay_run_id, fileName: r.file_name,
    total: toMoney(fils(BigInt(r.total))), createdAt: r.created_at,
    findings: findings.map(shown), errorCount: r.error_count,
    warningCount: r.warning_count, statement: SIF_STATEMENT,
    bankChangedSinceApproval: r.bank_drift };
}

async function byRun(tx: Db, companyId: string, runId: string) {
  const [r] = await tx.query<SifRow>(
    "SELECT * FROM sif_files WHERE company_id = $1 AND pay_run_id = $2",
    [companyId, runId]);
  return r ?? null;
}

export async function loadSif(tx: Db, companyId: string, id: string) {
  const [r] = await tx.query<SifRow>(
    "SELECT * FROM sif_files WHERE company_id = $1 AND id = $2",
    [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

function generate(batch: Parameters<typeof generateSif>[0]) {
  try {
    return generateSif(batch);
  } catch (e) {
    if (!(e instanceof EngineError)) throw e;
    throw new ApiError("SIF_GENERATION_FAILED", undefined,
      { engineCode: e.code });
  }
}

async function store(ctx: ReqCtx, runId: string, at: Date) {
  const { tx, deps } = ctx;
  const c = ctx.tenant!.companyId;
  const out = generate(await loadSifBatch(tx, deps, c, runId, at));
  const findings = validateSif(out.text, defaultLayout, dubaiDate(at));
  const errors = findings.filter((f) => f.severity === "error").length;
  const id = deps.newId();
  const s = await sealerFor(tx, deps, c, "sif_files");
  await tx.query(
    `INSERT INTO sif_files (id, company_id, pay_run_id, file_name, total,
       text_enc, findings_enc, error_count, warning_count, created_by,
       created_at, bank_drift)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [id, c, runId, out.fileName, out.total.toString(),
      s.seal("text_enc", id, out.text), s.seal("findings_enc", id,
        JSON.stringify(findings)), errors, findings.length - errors,
      ctx.user!.id, at.toISOString(),
      JSON.stringify(await bankDrift(tx, deps, c, runId))]);
  await appendAudit(tx, { companyId: c, at: at.toISOString(),
    actorUserId: ctx.user!.id, action: "sif.generated",
    entityType: "sif-file", entityId: id, data: { fileName: out.fileName,
      errorCount: errors, warningCount: findings.length - errors } });
  return id;
}

/** Approved runs only; one file per run (a repeat returns it, 200). */
export async function generateSifFile(ctx: ReqCtx<unknown, unknown,
  { id: string }>): Promise<Reply> {
  const c = ctx.tenant!.companyId;
  const run = await loadRun(ctx.tx, c, ctx.params.id, true);
  if (run.status !== "approved") throw new ApiError("RUN_NOT_APPROVED");
  const prior = await byRun(ctx.tx, c, run.id);
  if (prior !== null) return new Reply(200, await toSifFile(ctx.tx, ctx,
    prior));
  const id = await store(ctx, run.id, ctx.deps.now());
  return new Reply(201, await toSifFile(ctx.tx, ctx,
    await loadSif(ctx.tx, c, id)));
}

export async function getSifFile(ctx: ReqCtx<unknown, unknown,
  { id: string }>): Promise<SifFile> {
  return toSifFile(ctx.tx, ctx, await loadSif(ctx.tx,
    ctx.tenant!.companyId, ctx.params.id));
}

/** The file text (MFA route); every download is audited. */
export async function downloadSifFile(ctx: ReqCtx<unknown, unknown,
  { id: string }>): Promise<FileReply> {
  const c = ctx.tenant!.companyId;
  const r = await loadSif(ctx.tx, c, ctx.params.id);
  const s = await sealerFor(ctx.tx, ctx.deps, c, "sif_files");
  await appendAudit(ctx.tx, { companyId: c,
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id,
    action: "sif.downloaded", entityType: "sif-file", entityId: r.id,
    data: { fileName: r.file_name } });
  return new FileReply(s.open("text_enc", r.id, r.text_enc)!, r.file_name);
}
