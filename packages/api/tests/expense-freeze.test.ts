import { describe, expect, it } from "vitest";
import { createClaim, meal } from "./helpers/expense-fixtures";
import { guardCases } from "./helpers/freeze-cases";
import { world } from "./helpers/reimb-world";

describe("frozen claims (pglite)", () => {
  guardCases(async () => ({}));

  it("VAT above the amount is refused at save, not stored", async () => {
    const w = await world("vatsave");
    const r = await createClaim(w.ctx, w.s.employee, w.s,
      [meal(w.cats, "10.00", { vatAmount: "10.01" })]);
    expect(r.status).toBe(422);
    expect(r.body.error.detail.problems).toEqual(
      ["items.0:VAT_EXCEEDS_AMOUNT"]);
  });
});
