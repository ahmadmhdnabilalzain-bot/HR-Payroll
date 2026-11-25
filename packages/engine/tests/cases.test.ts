import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCases } from "../src/cases/runner";

const LIBRARY = join(import.meta.dirname, "..", "cases", "gratuity");
const dirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "cases-"));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { recursive: true });
});

async function sample(): Promise<Record<string, unknown>> {
  const text = await readFile(join(LIBRARY, "five-years.json"), "utf8");
  return JSON.parse(text) as Record<string, unknown>;
}

async function invalid(content: string): Promise<unknown> {
  const dir = await tempDir();
  await writeFile(join(dir, "bad.json"), content);
  return runCases(dir).catch((e: unknown) => e);
}

describe("case library", () => {
  it("has at least 8 cases and all pass", async () => {
    const reports = await runCases(LIBRARY);
    expect(reports.length).toBeGreaterThanOrEqual(8);
    for (const r of reports) expect(r.passed, r.id).toBe(true);
  });
  it("covers the five-year press example as 3500000", async () => {
    const reports = await runCases(LIBRARY);
    const five = reports.find((r) => r.id === "five-years");
    expect(five).toMatchObject({ expected: "3500000", actual: "3500000" });
  });
});

describe("runCases failures", () => {
  it("a wrong expectation fails with a trace, no throw", async () => {
    const dir = await tempDir();
    const wrong = { ...(await sample()), expectedFils: "1" };
    await writeFile(join(dir, "wrong.json"), JSON.stringify(wrong));
    const [r] = await runCases(dir);
    expect(r).toMatchObject({ passed: false, expected: "1",
      actual: "3500000" });
    expect(r!.trace.length).toBeGreaterThan(0);
  });
  it("malformed JSON throws INVALID_CASE_FILE naming the file", async () => {
    expect(await invalid("{nope")).toMatchObject({
      code: "INVALID_CASE_FILE", detail: { file: "bad.json" } });
  });
  it("a schema failure throws INVALID_CASE_FILE", async () => {
    const bad = { ...(await sample()), status: "guess" };
    expect(await invalid(JSON.stringify(bad))).toMatchObject({
      code: "INVALID_CASE_FILE", detail: { file: "bad.json" } });
  });
  it("an unknown sourceId throws INVALID_CASE_FILE", async () => {
    const bad = { ...(await sample()), sourceId: "NOPE" };
    expect(await invalid(JSON.stringify(bad))).toMatchObject({
      code: "INVALID_CASE_FILE", detail: { file: "bad.json" } });
  });
});

describe("case statuses claim no more than their sources", () => {
  const want: Record<string, [string, string]> = {
    "exactly-one-year": ["secondary", "LAW_33_2021"],
    "seven-years": ["secondary", "LAW_33_2021"],
    "two-year-cap": ["secondary", "LAW_33_2021"],
    "leap-day-joiner": ["convention", "ENGINE_CONVENTION"],
    "unpaid-leave-threshold": ["official", "UAE_GOV_EOSB"],
  };
  it.each(Object.keys(want))("%s", async (id) => {
    const text = await readFile(join(LIBRARY, `${id}.json`), "utf8");
    const c = JSON.parse(text) as { status: string; sourceId: string };
    expect([c.status, c.sourceId]).toEqual(want[id]);
  });
});
