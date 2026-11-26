import { describe, expect, it } from "vitest";
import { assertRuntimeRole } from "../src/db/role-check";
import { createTestDb } from "./helpers/test-db";
import { tenancyCases } from "./helpers/tenancy-cases";

describe("tenancy (pglite)", () => {
  tenancyCases(async () => {
    const db = await createTestDb();
    return { db, admin: db };
  });
});

describe("runtime role check", () => {
  it("refuses the pglite superuser", async () => {
    await expect(assertRuntimeRole(await createTestDb())).rejects.toThrow(
      /UNSAFE_DB_ROLE: runtime role is a superuser/);
  });
});
