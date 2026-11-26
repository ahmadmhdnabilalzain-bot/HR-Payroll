import { describe, expect, it } from "vitest";
import {
  claimAction,
  createClaim,
  meal,
  setLimits,
  submitted,
} from "./helpers/expense-fixtures";
import { as, world } from "./helpers/reimb-world";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  3, 1, 4]).toString("base64");

/** Money review M-2 and M-3 (and the claimant-role mutant of M-9). */
describe("limit roles and duplicate receipts", () => {
  it("the claimant's own role picks the limit row", async () => {
    const w = await world("roles");
    const row = (role: string | null, max: string) => ({
      categoryId: w.cats.meals, role, perItemMax: max, monthlyMax: null,
      receiptRequiredAbove: null, overLimit: "block" });
    await setLimits(w.ctx, w.s, [row(null, "100.00"),
      row("manager", "500.00")]);
    const mine = await submitted(w.ctx, w.s.manager, w.s,
      [meal(w.cats, "300.00")]);
    expect(mine.status).toBe("submitted");
    const c = await createClaim(w.ctx, w.s.employee, w.s,
      [meal(w.cats, "300.00")]);
    const r = await claimAction(w.ctx, w.s.employee, w.s, c.body.id,
      "submit");
    expect(r.body.error.detail.problems)
      .toEqual(["items.0:EXPENSE_OVER_LIMIT"]);
  });

  it("a receipt another employee claimed is a possible duplicate",
    async () => {
      const w = await world("dups");
      const theirs = await as(w, w.s.hr, "POST", "/v1/receipts", {
        fileName: "bill.png", contentType: "image/png", dataBase64: PNG,
        employeeId: w.s.emp.report2 });
      await submitted(w.ctx, w.s.hr, w.s, [meal(w.cats, "90.00",
        { receiptIds: [theirs.body.id] })], { employeeId: w.s.emp.report2 });
      const mine = await as(w, w.s.employee, "POST", "/v1/receipts", {
        fileName: "bill.png", contentType: "image/png", dataBase64: PNG });
      const c = await submitted(w.ctx, w.s.employee, w.s,
        [meal(w.cats, "91.00", { receiptIds: [mine.body.id] })]);
      expect(c.flags.map((f: { code: string }) => f.code))
        .toEqual(["POSSIBLE_DUPLICATE"]);
      expect(JSON.stringify(c)).not.toContain(w.s.emp.report2);
      const again = await as(w, w.s.employee, "POST", "/v1/receipts", {
        fileName: "bill.png", contentType: "image/png", dataBase64: PNG });
      const d = await submitted(w.ctx, w.s.employee, w.s,
        [meal(w.cats, "92.00", { receiptIds: [again.body.id] })]);
      expect(d.flags.map((f: { code: string }) => f.code))
        .toEqual(["DUPLICATE_RECEIPT"]);
    });
});
