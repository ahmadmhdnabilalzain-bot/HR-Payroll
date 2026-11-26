/**
 * Server entry (I/O shell). `tsx src/main.ts` migrates (as the owner
 * role in MIGRATE_DATABASE_URL) and serves (as the runtime role in
 * DATABASE_URL); `tsx src/main.ts migrate` only migrates;
 * `tsx src/main.ts jobs` runs each background job once;
 * `tsx src/main.ts purge-wfh` migrates, then deletes work-from-home
 * data past each company's retention (no scheduler). The runtime
 * role must be granted payroll_app by the operator:
 *   GRANT payroll_app TO <runtime role> WITH INHERIT FALSE, SET TRUE;
 */
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { buildChannelPorts } from "./channels/wire";
import { loadConfig, type Config } from "./config";
import { MIGRATIONS_DIR, migrate } from "./db/migrate";
import { openPg } from "./db/pg";
import { assertRuntimeRole } from "./db/role-check";
import { withTenant } from "./db/tenant";
import type { Enter } from "./http/context";
import { JOBS } from "./jobs/jobs";
import { systemDeps } from "./deps";
import { letterRenderer } from "./pdf/setup";
import type { Db } from "./db/db";
import { purgeAllCompanies } from "./db/wfh-purge-all";
import { fsBlobStore } from "./storage/fs-blob";

async function runMigrations(cfg: Config): Promise<void> {
  const owner = await openPg(cfg.migrateUrl, { max: 1 });
  try {
    const applied = await migrate(owner, MIGRATIONS_DIR);
    process.stdout.write(`${JSON.stringify({ event: "migrated",
      applied })}\n`);
  } finally {
    await owner.close();
  }
}

/** Each registered job once (an external scheduler calls this). */
async function runJobs(cfg: Config): Promise<void> {
  const db = await openPg(cfg.databaseUrl);
  try {
    await assertRuntimeRole(db);
    const { db: _db, ...deps } = systemDeps(db, cfg.masterKey,
      fsBlobStore(cfg.receiptsDir), { channels: buildChannelPorts(cfg) });
    const enter: Enter = (t, fn) => withTenant(db, t, fn);
    for (const job of JOBS) {
      const result = await job.run(enter, deps);
      process.stdout.write(`${JSON.stringify({ event: "job",
        name: job.name, ...result })}\n`);
    }
  } finally {
    await db.close();
  }
}

async function purgeWfh(cfg: Config, db: Db): Promise<void> {
  const owner = await openPg(cfg.migrateUrl, { max: 1 });
  try {
    const companies = await purgeAllCompanies(owner, db,
      { now: () => new Date() });
    process.stdout.write(`${JSON.stringify({ event: "wfh-purged",
      companies })}\n`);
  } finally {
    await owner.close();
    await db.close();
  }
}

async function main(argv: string[]): Promise<void> {
  const cfg = loadConfig(process.env);
  await runMigrations(cfg);
  if (argv[2] === "migrate") return;
  if (argv[2] === "jobs") return runJobs(cfg);
  const db = await openPg(cfg.databaseUrl);
  await assertRuntimeRole(db);
  if (argv[2] === "purge-wfh") return purgeWfh(cfg, db);
  const blobs = fsBlobStore(cfg.receiptsDir);
  const log = (line: Record<string, unknown>) =>
    process.stdout.write(`${JSON.stringify(line)}\n`);
  const pdf = letterRenderer(cfg, log);
  const app = createApp(systemDeps(db, cfg.masterKey, blobs,
    { channels: buildChannelPorts(cfg), pdf }));
  const server = serve({ fetch: app.fetch, port: cfg.port });
  const stop = () => {
    server.close();
    void pdf.close().finally(() => process.exit(0));
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  process.stdout.write(`${JSON.stringify({ event: "listening",
    port: cfg.port })}\n`);
}

main(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
