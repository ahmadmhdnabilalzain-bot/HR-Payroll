import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { ApiErrorBody } from "@payroll/contract";
import { EngineError } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError, asError, toErrorResponse } from "../src/http/errors";

describe("error mapping", () => {
  it("EngineError becomes 422 ENGINE_REFUSED with only the code", () => {
    const r = toErrorResponse(new EngineError("NO_PACK_FOR_DATE",
      "amount 7777.77 refused", { value: "7777.77" }), "req-1");
    expect(r.status).toBe(422);
    expect(r.body).toEqual({ error: { code: "ENGINE_REFUSED",
      message: expect.any(String), requestId: "req-1",
      detail: { engineCode: "NO_PACK_FOR_DATE" } } });
    expect(JSON.stringify(r.body)).not.toContain("7777.77");
  });
  it("anything else is 500 INTERNAL with the request id only", () => {
    const r = toErrorResponse(new Error("iban AE0703 leaked"), "req-2");
    expect(r.status).toBe(500);
    expect(ApiErrorBody.parse(r.body).error.code).toBe("INTERNAL");
    expect(JSON.stringify(r.body)).not.toContain("AE0703");
  });
  it("a ZodError becomes VALIDATION_FAILED with paths only", () => {
    const zerr = z.object({ iban: z.string().length(23) })
      .safeParse({ iban: "AE0703" }).error!;
    const e = asError(zerr);
    expect(e).toBeInstanceOf(ApiError);
    const r = toErrorResponse(e, "req-3");
    expect(r.status).toBe(400);
    expect(r.body.error.detail).toEqual({ fields: ["iban"],
      issues: ["too_small"] });
    expect(JSON.stringify(r.body)).not.toContain("AE0703");
  });
});

const SRC = join(import.meta.dirname, "..", "src");
const SHELL = new Set(["main.ts", "deps.ts"]);
const BANNED = [/new Date\(\)/, /Date\.now\(/, /randomUUID\(/,
  /process\.env/, /Math\.random\(/];

function listTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return listTs(p);
    return e.name.endsWith(".ts") ? [p] : [];
  });
}

describe("injected time, ids and config", () => {
  it("no clock, random id or env read outside main.ts and deps.ts", () => {
    for (const f of listTs(SRC)) {
      const rel = relative(SRC, f).split("\\").join("/");
      if (SHELL.has(rel)) continue;
      const text = readFileSync(f, "utf8");
      for (const re of BANNED) expect(re.test(text), `${rel} ${re}`)
        .toBe(false);
    }
  });
});
