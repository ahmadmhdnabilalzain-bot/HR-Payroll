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

  it("demo-data-only-in-adapter", () => {
    // adapter.ts, plus the pay run's lazy detail chunk beside it, plus
    // people.ts (People and Time off), which only adapter.ts imports.
    // One path per line, sorted on compare, so builders adding a line
    // in parallel merge without conflicts.
    const allowed = [
      "src/demo/data/adapter.ts",
      "src/demo/data/papers.ts",
      "src/demo/data/people.ts",
      "src/demo/data/run-detail.ts",
      "src/demo/data/run-explain.ts",
      "src/demo/data/time.ts",
      "src/reports/source.ts",
      "src/reports/cost/source.ts",
      "src/setup/access/data.ts",
      "src/demo/data/team-types.ts",
      "src/demo/data/team.ts",
      "src/demo/data/moves-types.ts",
      "src/demo/data/moves.ts",
      "src/demo/data/home-types.ts",
      "src/demo/data/home.ts",
      "src/demo/data/pay.ts",
    ];
    expect([...filesImporting(/^@payroll\/demo-data/)].sort())
      .toEqual([...allowed].sort());
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
