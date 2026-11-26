import { describe, expect, it } from "vitest";
import { createTestDb } from "./helpers/test-db";

/** Ruling 20: the only deletes are WFH retention and erasure. */
describe("delete grants", () => {
  it("payroll_app may delete exactly the WFH sample and pause tables",
    async () => {
      const db = await createTestDb();
      const rows = await db.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.role_table_grants
         WHERE grantee = 'payroll_app' AND privilege_type = 'DELETE'
         ORDER BY table_name`);
      expect(rows.map((r) => r.table_name)).toEqual([
        "wfh_activity_minutes", "wfh_location_samples", "wfh_pauses"]);
    });
});
