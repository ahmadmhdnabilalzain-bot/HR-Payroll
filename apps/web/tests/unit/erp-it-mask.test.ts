import { describe, expect, it } from "vitest";
import { buildSetupErpSource } from "../../src/setup/erp/source";
import { maskMoney } from "../../src/ui/mask";

const src = buildSetupErpSource();

describe("the IT manager sees no pay in the ledger and Teams pages", () => {
  it("the masked posting file blanks every debit and credit", () => {
    const rows = src.csvMasked.split("\r\n").slice(1);
    expect(rows).toHaveLength(src.posting.lines.length);
    expect(src.csvMasked).toContain("masked");
    expect(src.csvMasked).not.toMatch(/"\d+\.\d{2}"/);
    expect(src.csv).toMatch(/"\d+\.\d{2}"/);
  });

  it("card amounts and sentences mask like every other amount", () => {
    for (const c of src.cards) {
      expect(maskMoney(`${c.amount ?? ""} ${c.title} ${c.detail}`))
        .not.toMatch(/\d,\d{3}/);
    }
  });
});
