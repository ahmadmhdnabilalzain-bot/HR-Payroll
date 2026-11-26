/**
 * Recomputes every company's audit hash chain from the rows as stored
 * and prints one JSON line per company. Exit 0 when every chain is
 * intact, 1 when any is broken, 2 on a setup error.
 *
 *   VERIFY_DATABASE_URL=postgres://payroll_backup:...@host/payroll \
 *     node --import tsx deploy/verify-audit-chain.ts [companyId ...]
 *
 * VERIFY_DATABASE_URL must be a role that reads every row past
 * row-level security (payroll_backup from deploy/init-roles.sql). The
 * check only reads. It reuses the API's own verifyChain, the code
 * behind GET /v1/audit-events/verify.
 */
import { verifyChain } from "../packages/api/src/audit/audit";
import { openPg } from "../packages/api/src/db/pg";

async function companyIds(
  db: Awaited<ReturnType<typeof openPg>>,
  given: string[],
): Promise<string[]> {
  if (given.length > 0) return given;
  const rows = await db.query<{ id: string }>(
    "SELECT id FROM companies ORDER BY created_at, id");
  return rows.map((r) => r.id);
}

async function main(argv: string[]): Promise<number> {
  const url = process.env.VERIFY_DATABASE_URL;
  if (url === undefined || url === "") {
    process.stderr.write("VERIFY_DATABASE_URL is required\n");
    return 2;
  }
  const db = await openPg(url, { max: 1 });
  let broken = 0;
  try {
    const ids = await companyIds(db, argv);
    for (const companyId of ids) {
      const r = await db.transaction((tx) => verifyChain(tx, companyId));
      if (!r.ok) broken += 1;
      process.stdout.write(`${JSON.stringify({ event: "audit_chain",
        companyId, ...r })}\n`);
    }
    process.stdout.write(`${JSON.stringify({ event: "audit_chain_done",
      companies: ids.length, broken })}\n`);
  } finally {
    await db.close();
  }
  return broken === 0 ? 0 : 1;
}

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
}, (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`verify-audit-chain: ${message}\n`);
  process.exitCode = 2;
});
