/**
 * Server entry (I/O shell). `tsx src/main.ts` migrates (as the owner
 * role in MIGRATE_DATABASE_URL) and serves (as the runtime role in
 * DATABASE_URL); `tsx src/main.ts migrate` only migrates;
 * `tsx src/main.ts purge-wfh` migrates, then deletes work-from-home
 * data past each company's retention (no scheduler);
 * `tsx src/main.ts sweep-files` deletes uploads nobody claimed within
 * 24 hours (needs JOBS_LIST_DATABASE_URL, a role that lists every
 * company past RLS, e.g. payroll_backup). The runtime
 * role must be granted payroll_app by the operator:
 *   GRANT payroll_app TO <runtime role> WITH INHERIT FALSE, SET TRUE;
 */
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { loadConfig, type Config } from "./config";
import { MIGRATIONS_DIR, migrate } from "./db/migrate";
import { openPg } from "./db/pg";
import { assertRuntimeRole } from "./db/role-check";
import { systemDeps } from "./deps";
import { letterRenderer } from "./pdf/setup";
import type { Db } from "./db/db";
import { purgeAllCompanies } from "./db/wfh-purge-all";
import { sweepUnclaimedFiles } from "./db/files-sweep";
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

async function sweepFiles(cfg: Config): Promise<void> {
  if (cfg.jobsListUrl === null) {
    throw new Error("JOBS_LIST_DATABASE_URL is required for sweep-files");
  }
  const list = await openPg(cfg.jobsListUrl, { max: 1 });
  const owner = await openPg(cfg.migrateUrl, { max: 1 });
  try {
    const removed = await sweepUnclaimedFiles({ list, owner,
      blobs: fsBlobStore(cfg.receiptsDir), now: () => new Date(),
      olderThanHours: 24 });
    process.stdout.write(`${JSON.stringify({ event: "files-swept",
      removed })}\n`);
  } finally {
    await list.close();
    await owner.close();
  }
}

async function main(argv: string[]): Promise<void> {
  const cfg = loadConfig(process.env);
  await runMigrations(cfg);
  if (argv[2] === "migrate") return;
  if (argv[2] === "sweep-files") return sweepFiles(cfg);
  const db = await openPg(cfg.databaseUrl, { runtime: true });
  await assertRuntimeRole(db);
  if (argv[2] === "purge-wfh") return purgeWfh(cfg, db);
  const blobs = fsBlobStore(cfg.receiptsDir);
  const log = (line: Record<string, unknown>) =>
    process.stdout.write(`${JSON.stringify(line)}\n`);
  const pdf = letterRenderer(cfg, log);
  const app = createApp(systemDeps(db, cfg.masterKey, blobs, pdf));
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
