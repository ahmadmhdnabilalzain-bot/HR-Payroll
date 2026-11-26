import { execFileSync } from "node:child_process";
import { chownSync, existsSync, mkdtempSync, readdirSync, rmSync } from
  "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Vitest global setup: when no DATABASE_URL is given and a PostgreSQL
 * server binary is installed, start a throwaway cluster (temp data
 * dir, free port, trust auth on 127.0.0.1) so the real-PostgreSQL
 * suite runs inside `pnpm check`. As root it runs the server as the
 * `postgres` user (initdb refuses root). Anything missing: print one
 * line and skip; never fail. Set PAYROLL_TEST_PG=0 to turn it off.
 */
function binDir(): string | null {
  const root = "/usr/lib/postgresql";
  if (!existsSync(root)) return null;
  const versions = readdirSync(root).sort((a, b) => Number(b) - Number(a));
  for (const v of versions) {
    const dir = join(root, v, "bin");
    if (existsSync(join(dir, "initdb"))) return dir;
  }
  return null;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const a = srv.address();
      srv.close(() => resolve(typeof a === "object" && a ? a.port : 0));
    });
  });
}

function runner(asRoot: boolean) {
  return (cmd: string, args: string[]) => execFileSync(
    asRoot ? "runuser" : cmd,
    asRoot ? ["-u", "postgres", "--", cmd, ...args] : args,
    { stdio: "pipe", timeout: 60_000 });
}

export default async function setup(): Promise<(() => void) | void> {
  if (process.env.DATABASE_URL || process.env.PAYROLL_TEST_PG === "0") {
    return;
  }
  const bin = binDir();
  if (bin === null) {
    console.log("real PostgreSQL tests skipped: no server binary found");
    return;
  }
  const asRoot = process.getuid?.() === 0;
  const dir = mkdtempSync(join(tmpdir(), "payroll-pg-"));
  const run = runner(asRoot);
  const data = join(dir, "data");
  try {
    if (asRoot) {
      const uid = Number(execFileSync("id", ["-u", "postgres"]).toString());
      const gid = Number(execFileSync("id", ["-g", "postgres"]).toString());
      chownSync(dir, uid, gid);
    }
    const port = await freePort();
    run(join(bin, "initdb"), ["-D", data, "-A", "trust", "-U", "postgres",
      "--no-sync"]);
    run(join(bin, "pg_ctl"), ["-D", data, "-w", "-l", join(dir, "log"),
      "-o", `-p ${port} -k ${dir} -c listen_addresses=127.0.0.1 ` +
        "-c fsync=off", "start"]);
    process.env.DATABASE_URL = `postgres://postgres@127.0.0.1:${port}/postgres`;
  } catch (e) {
    console.log(`real PostgreSQL tests skipped: ${(e as Error).message
      .split("\n")[0]}`);
    rmSync(dir, { recursive: true, force: true });
    return;
  }
  return () => {
    try {
      run(join(bin, "pg_ctl"), ["-D", data, "-m", "fast", "stop"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
}
