import { copyFileSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MIGRATIONS_DIR, migrate } from "../src/db/migrate";
import { openPglite } from "../src/db/pglite";

function copyOfMigrations(): string {
  const dir = mkdtempSync(join(tmpdir(), "mig-"));
  for (const f of readdirSync(MIGRATIONS_DIR)) {
    copyFileSync(join(MIGRATIONS_DIR, f), join(dir, f));
  }
  return dir;
}

describe("migrate", () => {
  it("applies each file once, in order", async () => {
    const db = await openPglite();
    const first = await migrate(db, MIGRATIONS_DIR);
    expect(first[0]).toBe("001_tenancy.sql");
    expect(first).toEqual([...first].sort());
    expect(await migrate(db, MIGRATIONS_DIR)).toEqual([]);
    const rows = await db.query<{ name: string; applied_at: string }>(
      "SELECT name, applied_at FROM schema_migrations ORDER BY name");
    expect(rows.map((r) => r.name)).toEqual(first);
    expect(rows[0]?.applied_at).toMatch(/Z$/);
    await db.close();
  });

  it("rejects a badly named file", async () => {
    const dir = copyOfMigrations();
    writeFileSync(join(dir, "002-bad.sql"), "SELECT 1;");
    const db = await openPglite();
    await expect(migrate(db, dir)).rejects.toMatchObject(
      { code: "MIGRATION_NAME" });
    await db.close();
  });

  it("rolls back a failing file and records nothing", async () => {
    const dir = copyOfMigrations();
    writeFileSync(join(dir, "900_broken.sql"),
      "CREATE TABLE half (id int); SELECT nope;");
    const db = await openPglite();
    await expect(migrate(db, dir)).rejects.toThrow();
    const half = await db.query("SELECT to_regclass('half') AS t");
    expect(half).toEqual([{ t: null }]);
    const names = await db.query<{ name: string }>(
      "SELECT name FROM schema_migrations");
    expect(names.map((r) => r.name)).not.toContain("900_broken.sql");
    await db.close();
  });
});
