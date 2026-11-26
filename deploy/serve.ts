/**
 * Serve-only entry for containers: the same steps as the serve half of
 * packages/api/src/main.ts, without its migration step, so the API
 * container needs only the runtime role (DATABASE_URL) and never the
 * table owner's password. Migrations run in the one-shot migrate job.
 *
 * Remove this file once main.ts has a serve-only mode (see
 * docs/ops/ops-kit-report.md).
 */
import { serve } from
  "../packages/api/node_modules/@hono/node-server/dist/index.mjs";
import { createApp } from "../packages/api/src/app";
import { buildChannelPorts } from "../packages/api/src/channels/wire";
import { loadConfig } from "../packages/api/src/config";
import { openPg } from "../packages/api/src/db/pg";
import { assertRuntimeRole } from "../packages/api/src/db/role-check";
import { systemDeps } from "../packages/api/src/deps";
import { letterRenderer } from "../packages/api/src/pdf/setup";
import { fsBlobStore } from "../packages/api/src/storage/fs-blob";

async function main(): Promise<void> {
  const cfg = loadConfig(process.env);
  const db = await openPg(cfg.databaseUrl);
  await assertRuntimeRole(db);
  const log = (line: Record<string, unknown>) =>
    process.stdout.write(`${JSON.stringify(line)}\n`);
  const app = createApp(systemDeps(db, cfg.masterKey,
    fsBlobStore(cfg.receiptsDir), { channels: buildChannelPorts(cfg),
      pdf: letterRenderer(cfg, log) }));
  serve({ fetch: app.fetch, port: cfg.port });
  process.stdout.write(`${JSON.stringify({ event: "listening",
    port: cfg.port, migrations: "skipped (serve-only)" })}\n`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
