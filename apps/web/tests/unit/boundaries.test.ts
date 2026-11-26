import { describe, expect, it } from "vitest";
import { filesUnder, readWeb } from "../helpers/files";

const SRC = filesUnder("src", [".ts", ".tsx"]);
const CONTRACT = "src/api/contract.ts";

const importsOf = (file: string): string[] =>
  [...readWeb(file).matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1] ?? "");

const filesImporting = (re: RegExp): string[] =>
  SRC.filter((f) => importsOf(f).some((i) => re.test(i)));

describe("boundaries", () => {
  it("contract-imported-once", () => {
    expect(filesImporting(/^@payroll\/contract/)).toEqual([CONTRACT]);
  });

  it("wps-only-in-mock", () => {
    const outside = filesImporting(/^@payroll\/wps/)
      .filter((f) => !f.startsWith("src/api/mock/"));
    expect(outside).toEqual([]);
  });

  it("no-other-workspace-imports", () => {
    const bad = filesImporting(/^@payroll\//).filter((f) =>
      importsOf(f).some((i) => i.startsWith("@payroll/") &&
        !/^@payroll\/(engine|wps|contract|demo-data)$/.test(i)));
    expect(bad).toEqual([]);
  });

  // people.ts is the adapter's People and Time off half; only
  // adapter.ts imports it, so both stay in the lazy data chunk.
  it("demo-data-only-in-adapter", () => {
    expect(filesImporting(/^@payroll\/demo-data/))
      .toEqual(["src/demo/data/adapter.ts", "src/demo/data/people.ts"]);
  });

  it("money-wire-only-in-contract", () => {
    const bad = SRC.filter((f) => f !== CONTRACT)
      .filter((f) => /\b(parseAed|toWireMoney)\s*\(/.test(readWeb(f)));
    expect(bad).toEqual([]);
  });

  it("clock-only-in-main", () => {
    const bad = SRC.filter((f) => f !== "src/main.tsx")
      .filter((f) => /new Date\(\s*\)|Date\.now\(/.test(readWeb(f)));
    expect(bad).toEqual([]);
  });
});
