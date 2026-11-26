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

const byNumber = (a: string, b: string) =>
  parseInt(a, 10) - parseInt(b, 10);

describe("migrate", () => {
  it("migrate_numeric_order: 3- and 4-digit names in number order",
    async () => {
      const dir = copyOfMigrations();
      writeFileSync(join(dir, "1399_late.sql"),
        "CREATE TABLE late_one (id int);");
      writeFileSync(join(dir, "13010_x.sql"), "SELECT 1;");
      const db = await openPglite();
      await expect(migrate(db, dir)).rejects.toMatchObject(
        { code: "MIGRATION_NAME" });
      const ok = copyOfMigrations();
      writeFileSync(join(ok, "1399_late.sql"),
        "CREATE TABLE late_one (id int);");
      const applied = await migrate(db, ok);
      expect(applied.at(-1)).toBe("1399_late.sql");
      expect(applied.indexOf("601_approvals.sql"))
        .toBeLessThan(applied.indexOf("1399_late.sql"));
      expect(applied).toEqual([...applied].sort(byNumber));
      await db.close();
    });

  it("applies each file once, in order", async () => {
    const db = await openPglite();
    const first = await migrate(db, MIGRATIONS_DIR);
    expect(first[0]).toBe("001_tenancy.sql");
    expect(first).toEqual([...first].sort(byNumber));
    expect(await migrate(db, MIGRATIONS_DIR)).toEqual([]);
    const rows = await db.query<{ name: string; applied_at: string }>(
      "SELECT name, applied_at FROM schema_migrations ORDER BY name");
    expect(rows.map((r) => r.name)).toEqual([...first].sort());
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
