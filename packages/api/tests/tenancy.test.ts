import { describe } from "vitest";
import { createTestDb } from "./helpers/test-db";
import { tenancyCases } from "./helpers/tenancy-cases";

describe("tenancy (pglite)", () => {
  tenancyCases(createTestDb);
});
