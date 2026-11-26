import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runPayrollCases } from "../src/cases/payroll-runner";

const LIBRARY = join(import.meta.dirname, "..", "cases", "payroll");
const dirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "payroll-cases-"));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { recursive: true });
});

async function sample(): Promise<Record<string, unknown>> {
  const text = await readFile(join(LIBRARY, "national-dl57-wage.json"),
    "utf8");
  return JSON.parse(text) as Record<string, unknown>;
}

async function runOne(c: Record<string, unknown>) {
  const dir = await tempDir();
  await writeFile(join(dir, "case.json"), JSON.stringify(c));
  return runPayrollCases(dir).catch((e: unknown) => e);
}

describe("payroll case library", () => {
  it("has at least 10 cases and all pass", async () => {
    const reports = await runPayrollCases(LIBRARY);
    expect(reports.length).toBeGreaterThanOrEqual(10);
    for (const r of reports) {
      expect(r.passed, `${r.id} ${JSON.stringify(r.actual)}`).toBe(true);
    }
  });
  it("pins the DL57 case", async () => {
    const reports = await runPayrollCases(LIBRARY);
    const r = reports.find((x) => x.id === "national-dl57-wage");
    expect(r?.actual).toMatchObject({ net: "1335000",
      employerCost: "187500" });
    expect(r?.trace.length).toBeGreaterThan(0);
  });
  it("rejects an unknown source id", async () => {
    const bad = { ...(await sample()), sourceIds: ["DL57_ART4", "NOPE"] };
    expect(await runOne(bad)).toMatchObject({ code: "INVALID_CASE_FILE",
      detail: { file: "case.json" } });
  });
  it("rejects a schema failure", async () => {
    const bad = { ...(await sample()), status: "guess" };
    expect(await runOne(bad)).toMatchObject({ code: "INVALID_CASE_FILE" });
  });
  it("reports an engine error as ERROR <code>", async () => {
    const { overrides: _drop, ...rest } = await sample();
    const reports = await runOne(rest);
    expect(reports).toMatchObject([{ passed: false,
      actual: "ERROR UNSOURCED_PARAM", trace: [] }]);
  });
});
