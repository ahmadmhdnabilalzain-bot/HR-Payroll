import { describe, expect, it } from "vitest";
import { defaultLayout as L } from "../src/layout";
import { lookupRouting, ROUTING_CODES } from "../src/routing-codes";
import { validateSif } from "../src/validate";
import { BASE, setField as set, text } from "./fixtures";

describe("lookupRouting", () => {
  it("finds Dubai Islamic Bank", () => {
    expect(lookupRouting("802420101")).toBe("Dubai Islamic Bank");
  });
  it("returns null for a code not in the table", () => {
    expect(lookupRouting("999999999")).toBeNull();
    expect(lookupRouting("")).toBeNull();
  });
  it("has well formed, unique codes", () => {
    for (const r of ROUTING_CODES) {
      expect(r.code).toMatch(/^[0-9]{9}$/);
      expect(r.name.length).toBeGreaterThan(0);
    }
    const codes = ROUTING_CODES.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
  it("has the entity ids the guide samples confirm", () => {
    const id = (code: string): string | undefined =>
      ROUTING_CODES.find((r) => r.code === code)?.entityId;
    expect(id("802420101")).toBe("024");
    expect(id("703420114")).toBe("034");
  });
});

describe("ROUTING_UNKNOWN", () => {
  it("is a warning for a well formed code not in the table", () => {
    const fs = validateSif(text(set(1, 3, "123456789")), L);
    const hits = fs.filter((f) => f.code === "ROUTING_UNKNOWN");
    expect(hits).toEqual([
      expect.objectContaining({
        severity: "warning", line: 1, field: 3, value: "123456789",
      }),
    ]);
  });
  it("fires once per distinct unknown code, at its first line", () => {
    const lines = set(1, 3, "123456789", set(3, 3, "123456789",
      set(4, 3, "987654321")));
    const fs = validateSif(text(lines), L);
    expect(
      fs.filter((f) => f.code === "ROUTING_UNKNOWN")
        .map((f) => [f.line, f.value]),
    ).toEqual([[1, "123456789"], [4, "987654321"]]);
  });
  it("is reported on the SCR too, once per line", () => {
    const fs = validateSif(text(set(4, 3, "123456789")), L);
    expect(
      fs.filter((f) => f.code === "ROUTING_UNKNOWN").map((f) => f.line),
    ).toEqual([4]);
  });
  it("does not repeat on an EVP that follows its EDR", () => {
    const lines = set(2, 3, "123456789", set(1, 3, "123456789"));
    const fs = validateSif(text(lines), L);
    expect(
      fs.filter((f) => f.code === "ROUTING_UNKNOWN").map((f) => f.line),
    ).toEqual([1]);
  });
  it("is not reported for a malformed code (ROUTING_FORMAT only)", () => {
    const fs = validateSif(text(set(3, 3, "8024")), L);
    expect(fs.some((f) => f.code === "ROUTING_UNKNOWN")).toBe(false);
    expect(fs.some((f) => f.code === "ROUTING_FORMAT")).toBe(true);
  });
  it("is silent for known codes", () => {
    expect(validateSif(text(BASE), L)).toEqual([]);
  });
});
