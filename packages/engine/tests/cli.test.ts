import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli";

const sample = join(import.meta.dirname, "../samples/settlement.json");

describe("runCli", () => {
  it("prints gratuity, total, trace and not computed", async () => {
    const r = await runCli([sample]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("AED 35,000.00");
    expect(r.out).toContain("AED 38,333.33");
    expect(r.out).toContain("Not computed:");
    expect(r.out).toContain("notice pay");
    expect(r.out).not.toContain("HYPOTHETICAL");
  });
  it("--lang ar differs from English", async () => {
    const en = await runCli([sample]);
    const ar = await runCli([sample, "--lang", "ar"]);
    expect(ar.code).toBe(0);
    expect(ar.out).not.toBe(en.out);
  });
  it("--change prints a HYPOTHETICAL section with delta", async () => {
    const r = await runCli(
      [sample, "--change", "ae-gratuity:tier1DaysPerYear=22"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("HYPOTHETICAL");
    expect(r.out).toContain("Before: AED 38,333.33");
    expect(r.out).toContain("After: AED 40,000.00");
    expect(r.out).toContain("Delta: AED 1,666.67");
  });
  it("missing file is INVALID_INPUT_FILE", async () => {
    const r = await runCli(["/no/such/file.json"]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^INVALID_INPUT_FILE/);
  });
  it("unknown flag is INVALID_ARGS", async () => {
    const r = await runCli([sample, "--bogus"]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^INVALID_ARGS/);
  });
  it("malformed --change is INVALID_ARGS", async () => {
    for (const bad of ["nocolon", "a:b", "a:=1", ":k=1"]) {
      const r = await runCli([sample, "--change", bad]);
      expect(r.code).toBe(1);
      expect(r.out).toMatch(/^INVALID_ARGS/);
    }
  });
  it("bad --lang is INVALID_ARGS", async () => {
    const r = await runCli([sample, "--lang", "fr"]);
    expect(r.out).toMatch(/^INVALID_ARGS/);
  });
  it("unknown pack surfaces the engine error code", async () => {
    const r = await runCli([sample, "--change", "nope:x=1"]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^MISSING_PACK/);
  });
});

describe("runCli labels", () => {
  const change = ["--change", "ae-gratuity:tier1DaysPerYear=22"];
  it("english names the total as partial", async () => {
    const r = await runCli([sample]);
    expect(r.out.split("\n")[0]).toBe("Computed total (excludes notice " +
      "pay, deductions and other dues): AED 38,333.33");
    expect(r.out).not.toMatch(/final|Settlement total/i);
  });
  it("arabic localises every header and the not-computed items",
    async () => {
      const r = await runCli([sample, "--lang", "ar", ...change]);
      expect(r.code).toBe(0);
      for (const en of ["Computed total", "Not computed", "HYPOTHETICAL",
        "Before:", "After:", "Delta:", "notice pay", "deductions",
        "other dues", "not law"]) {
        expect(r.out, en).not.toContain(en);
      }
      for (const ar of ["المجموع المحسوب", "غير محسوب", "بدل الإنذار",
        "الخصومات", "المستحقات الأخرى", "افتراضي", "قبل:", "بعد:",
        "الفرق:"]) {
        expect(r.out, ar).toContain(ar);
      }
      expect(r.out).toContain("⁦AED 1,666.67⁩");
    });
});

describe("runCli errors", () => {
  const base = { joiningDate: "2019-01-01", lastWorkingDate: "2023-12-31",
    unpaidLeaveDays: 0, basicMonthlyAed: "10000.00",
    workerClass: "expat-full-time", unusedLeaveDays: 10 };
  async function withSample(more: object) {
    const dir = await mkdtemp(join(tmpdir(), "cli-"));
    const file = join(dir, "s.json");
    await writeFile(file, JSON.stringify({ ...base, ...more }));
    try {
      return await runCli([file]);
    } finally {
      await rm(dir, { recursive: true });
    }
  }
  it("prints code, message and detail on one line", async () => {
    const r = await withSample({ joiningDate: "2019-02-30" });
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^INVALID_DATE: .+ field=joiningDate /);
    expect(r.out).toContain("value=2019-02-30");
    expect(r.out).not.toContain("\n");
  });
  it("names lastWorkingDate when that date is bad", async () => {
    const r = await withSample({ lastWorkingDate: "2023-13-01" });
    expect(r.out).toMatch(/field=lastWorkingDate/);
  });
  it("keeps a schema failure on one line", async () => {
    const r = await withSample({ unpaidLeaveDays: "x" });
    expect(r.out).toMatch(/^INVALID_INPUT_FILE: /);
    expect(r.out).toMatch(/ file=/);
    expect(r.out).not.toContain("\n");
  });
  it("gcc national is refused without override advice", async () => {
    const r = await withSample({ workerClass: "gcc-national" });
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^UNSOURCED_PARAM: GCC national gratuity is not/);
    expect(r.out).toContain("key=gccNationalGratuity");
    expect(r.out).not.toMatch(/override/i);
  });
});
