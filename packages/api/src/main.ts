/**
 * Server entry (I/O shell). `tsx src/main.ts` migrates (as the owner
 * role in MIGRATE_DATABASE_URL) and serves (as the runtime role in
 * DATABASE_URL); `tsx src/main.ts migrate` only migrates;
 * `tsx src/main.ts jobs` runs each background job once. The runtime
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
      fsBlobStore(cfg.receiptsDir), buildChannelPorts(cfg));
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

async function main(argv: string[]): Promise<void> {
  const cfg = loadConfig(process.env);
  await runMigrations(cfg);
  if (argv[2] === "migrate") return;
  if (argv[2] === "jobs") return runJobs(cfg);
  const db = await openPg(cfg.databaseUrl);
  await assertRuntimeRole(db);
  const blobs = fsBlobStore(cfg.receiptsDir);
  const app = createApp(systemDeps(db, cfg.masterKey, blobs,
    buildChannelPorts(cfg)));
  serve({ fetch: app.fetch, port: cfg.port });
  process.stdout.write(`${JSON.stringify({ event: "listening",
    port: cfg.port })}\n`);
}

main(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
