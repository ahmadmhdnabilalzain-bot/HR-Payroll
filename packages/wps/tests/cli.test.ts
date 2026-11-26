import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli, type CliIo } from "../src/cli";
import { nodeIo } from "../src/shell";
import { validateSif } from "../src/validate";

const sample = join(import.meta.dirname, "../samples/batch.json");

/** In-memory files and a fixed clock; records every write. */
function memIo(files: Record<string, string>, today = "2026-11-26") {
  const writes: string[] = [];
  const io: CliIo = {
    read: async (path) => {
      const text = files[path];
      if (text === undefined) throw new Error("no file");
      return text;
    },
    write: async (dir, name, text) => {
      const path = `${dir}/${name}`;
      files[path] = text;
      writes.push(path);
      return path;
    },
    today: () => today,
  };
  return { io, writes, files };
}

const DIB_LINES = [
  "EDR,00915012345663,802420101,AE160240043520123456701," +
    "2016-01-01,2016-01-31,31,4000.00,2500.00,0",
  "EVP,00915012345663,802420101,500.00,200.00,300.00,0.00,400.00," +
    "1100.00,0.00",
  "SCR,0000000123456,802420101,2016-01-26,1130,012016,1,6500.00," +
    "AED,abc company",
];
const SIF = DIB_LINES.join("\r\n") + "\r\n";

async function sampleJson(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(sample, "utf8")) as
    Record<string, unknown>;
}

describe("sif generate", () => {
  it("sample batch writes a file whose validation has no errors",
    async () => {
      const dir = await mkdtemp(join(tmpdir(), "sif-"));
      try {
        const r = await runCli(["generate", sample, "--out", dir], nodeIo);
        expect(r.code, r.out).toBe(0);
        const path = join(dir, "0000000123456160126113000.SIF");
        const text = await readFile(path, "utf8");
        expect(text).toBe(SIF);
        const errors = validateSif(text, undefined, "2026-11-26")
          .filter((f) => f.severity === "error");
        expect(errors).toEqual([]);
        expect(r.out).toContain("No errors");
        expect(r.out).toContain(`Wrote ${path}`);
      } finally {
        await rm(dir, { recursive: true });
      }
    });
  it("defaults --out to out", async () => {
    const m = memIo({ "b.json": await readFile(sample, "utf8") });
    const r = await runCli(["--", "generate", "b.json"], m.io);
    expect(r.code, r.out).toBe(0);
    expect(m.writes).toEqual(["out/0000000123456160126113000.SIF"]);
  });
  it("--today decides whether the creation date is in the future",
    async () => {
      const files = { "b.json": await readFile(sample, "utf8") };
      const early = memIo({ ...files });
      const r1 = await runCli(
        ["generate", "b.json", "--today", "2016-01-25"], early.io);
      expect(r1.code).toBe(1);
      expect(r1.out).toContain("FUTURE_CREATION_DATE");
      expect(early.writes).toEqual([]);
      const ok = memIo({ ...files });
      const r2 = await runCli(
        ["generate", "b.json", "--today", "2016-01-26"], ok.io);
      expect(r2.code, r2.out).toBe(0);
      expect(ok.writes).toHaveLength(1);
    });
  it("invalid JSON field names the path and writes nothing", async () => {
    const json = await sampleJson();
    const emp = (json.employees as { edr: Record<string, unknown> }[])[0];
    if (emp === undefined) throw new Error("sample has no employee");
    emp.edr.fixed = "4,000.00";
    const m = memIo({ "b.json": JSON.stringify(json) });
    const r = await runCli(["generate", "b.json"], m.io);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^INVALID_BATCH_FILE: /);
    expect(r.out).toContain("employees.0.edr.fixed");
    expect(r.out).not.toContain("\n");
    expect(m.writes).toEqual([]);
  });
  it("names a bad date and a bad id by path", async () => {
    const json = await sampleJson();
    json.createdDate = "2016-02-30";
    json.employerId = "12a456";
    const m = memIo({ "b.json": JSON.stringify(json) });
    const r = await runCli(["generate", "b.json"], m.io);
    expect(r.code).toBe(1);
    expect(r.out).toContain("createdDate");
    expect(r.out).toContain("employerId");
  });
  it("text that is not JSON is a clear error", async () => {
    const m = memIo({ "b.json": "{ nope" });
    const r = await runCli(["generate", "b.json"], m.io);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^INVALID_BATCH_FILE: .*not valid JSON/);
  });
  it("a generator error is reported and nothing is written", async () => {
    const json = await sampleJson();
    const emp = (json.employees as { edr: Record<string, unknown> }[])[0];
    if (emp === undefined) throw new Error("sample has no employee");
    emp.edr.days = 30;
    const m = memIo({ "b.json": JSON.stringify(json) });
    const r = await runCli(["generate", "b.json"], m.io);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^DAYS_MISMATCH/);
    expect(m.writes).toEqual([]);
  });
  it("refuses to write when validation finds errors", async () => {
    const m = memIo({ "b.json": await readFile(sample, "utf8") },
      "2016-01-25");
    const r = await runCli(["generate", "b.json"], m.io);
    expect(r.code).toBe(1);
    expect(r.out).toContain("FUTURE_CREATION_DATE");
    expect(r.out).toContain("Not written");
    expect(m.writes).toEqual([]);
  });
});

describe("sif check", () => {
  it("a clean file exits 0 with warnings only", async () => {
    const m = memIo({ "f.SIF": SIF });
    const r = await runCli(["check", "f.SIF"], m.io);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toMatch(/^No errors, 1 warning in f\.SIF\./);
    expect(r.out).toContain("IBAN_CHECKSUM");
  });
  it("a corrupted total exits 1 with TOTAL_MISMATCH", async () => {
    const bad = SIF.replace(",6500.00,", ",6500.01,");
    const m = memIo({ "f.SIF": bad });
    const r = await runCli(["check", "f.SIF"], m.io);
    expect(r.code).toBe(1);
    expect(r.out).toContain("TOTAL_MISMATCH");
  });
  it("without --today the clock date is used", async () => {
    const m = memIo({ "f.SIF": SIF }, "2016-01-25");
    const r = await runCli(["check", "f.SIF"], m.io);
    expect(r.code).toBe(1);
    expect(r.out).toContain("FUTURE_CREATION_DATE");
  });
  it("--today overrides the clock", async () => {
    const m = memIo({ "f.SIF": SIF }, "2016-01-25");
    const r = await runCli(["check", "f.SIF", "--today", "2016-01-26"],
      m.io);
    expect(r.code, r.out).toBe(0);
  });
  it("a bad --today is INVALID_DATE, not a crash", async () => {
    const m = memIo({ "f.SIF": SIF });
    const r = await runCli(["check", "f.SIF", "--today", "2016-13-01"],
      m.io);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^INVALID_DATE/);
  });
  it("a missing file is INVALID_INPUT_FILE", async () => {
    const r = await runCli(["check", "nope.SIF"], memIo({}).io);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^INVALID_INPUT_FILE/);
  });
  it("the real clock gives a valid ISO date", () => {
    expect(nodeIo.today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("the real clock is the Dubai calendar date", () => {
    const dubai = new Date().toLocaleDateString("en-CA",
      { timeZone: "Asia/Dubai" });
    expect(nodeIo.today()).toBe(dubai);
  });
});

describe("sif args", () => {
  const io = memIo({}).io;
  it.each([
    [[]],
    [["bogus", "x"]],
    [["check"]],
    [["check", "a", "b"]],
    [["check", "a", "--bogus"]],
    [["check", "a", "--out", "d"]],
    [["generate", "a", "--out"]],
  ])("%j is INVALID_ARGS", async (args) => {
    const r = await runCli(args, io);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^INVALID_ARGS/);
  });
});
