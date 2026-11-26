import { EMIRATISATION_OVERRIDABLE as CONTRACT } from "@payroll/contract";
import { EMIRATISATION_OVERRIDABLE as ENGINE } from "@payroll/engine";
import { describe, expect, it } from "vitest";

describe("Emiratisation override keys", () => {
  it("the contract's copy equals the engine's list", () => {
    expect([...CONTRACT]).toEqual([...ENGINE]);
  });
});
