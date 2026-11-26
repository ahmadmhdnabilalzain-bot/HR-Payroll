// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build, type Rolldown } from "vite";
import { describe, expect, it } from "vitest";
import { WEB_ROOT } from "../helpers/files";

type Out = Rolldown.RolldownOutput;

const chunks = (out: Out | Out[]) =>
  (Array.isArray(out) ? out : [out]).flatMap((o) => o.output)
    .filter((c) => c.type === "chunk");

describe("bundle", () => {
  it("engine-runs-as-browser-bundle", async () => {
    // Inside apps/web, so the workspace package resolves.
    const cache = join(WEB_ROOT, "node_modules", ".cache");
    mkdirSync(cache, { recursive: true });
    const dir = mkdtempSync(join(cache, "engine-bundle-"));
    const entry = join(dir, "entry.ts");
    writeFileSync(entry, [
      'import { calculateSettlement, GRATUITY_PACKS, parseAed }',
      '  from "@payroll/engine";',
      "export const total = calculateSettlement({ gratuity: {",
      '  joiningDate: "2019-01-01", lastWorkingDate: "2023-12-31",',
      '  unpaidLeaveDays: 0, lastBasicMonthly: parseAed("10000.00"),',
      '  workerClass: "expat-full-time" }, unusedLeaveDays: 10 },',
      "  GRATUITY_PACKS).value.total;",
    ].join("\n"));
    const out = await build({ root: WEB_ROOT, configFile: false,
      logLevel: "silent",
      build: { write: false, minify: false, target: "es2022",
        lib: { entry, formats: ["es"], fileName: "engine" } } });
    const [chunk] = chunks(out as Out | Out[]);
    const code = chunk?.type === "chunk" ? chunk.code : "";
    expect(code).not.toMatch(/from\s+["']node:|require\(/);
    const file = join(dir, "engine.mjs");
    writeFileSync(file, code);
    const mod = await import(pathToFileURL(file).href) as { total: bigint };
    expect(mod.total).toBe(3833333n);
  }, 60000);

  it("gratuity-code-not-in-entry-chunk", async () => {
    const out = await build({ root: WEB_ROOT, logLevel: "silent",
      build: { write: false } });
    const entry = chunks(out as Out | Out[]).find((c) =>
      c.type === "chunk" && c.isEntry);
    const code = entry?.type === "chunk" ? entry.code : "";
    expect(code.length).toBeGreaterThan(0);
    expect(code).not.toContain("tier1DaysPerYear");
  }, 60000);
});
