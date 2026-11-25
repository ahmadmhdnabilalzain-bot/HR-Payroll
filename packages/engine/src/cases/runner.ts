import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { EngineError } from "../errors";
import { calculateGratuity, type WorkerClass } from "../gratuity";
import { fils } from "../money";
import { GRATUITY_PACKS } from "../rules/gratuity-pack";
import { sourceOf } from "../sources";
import type { TraceLine } from "../trace-types";
import { CaseFileSchema, type CaseFile } from "./schema";

export interface CaseReport {
  id: string;
  passed: boolean;
  expected: string;
  actual: string;
  trace: TraceLine[];
}

function invalidCase(file: string, why: string): EngineError {
  return new EngineError("INVALID_CASE_FILE",
    `invalid case file ${file}: ${why}`, { file, why });
}

function parseCase(file: string, text: string): CaseFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw invalidCase(file, "not valid JSON");
  }
  const parsed = CaseFileSchema.safeParse(json);
  if (!parsed.success) {
    throw invalidCase(file, parsed.error.message);
  }
  try {
    sourceOf(parsed.data.sourceId);
  } catch {
    throw invalidCase(file, `unknown sourceId ${parsed.data.sourceId}`);
  }
  return parsed.data;
}

function execute(c: CaseFile): CaseReport {
  const base = { id: c.id, expected: c.expectedFils };
  try {
    const i = c.input;
    const r = calculateGratuity({ ...i,
      lastBasicMonthly: fils(BigInt(i.lastBasicMonthly)),
      workerClass: i.workerClass as WorkerClass }, GRATUITY_PACKS);
    const actual = String(r.value.amount);
    return { ...base, passed: actual === c.expectedFils, actual,
      trace: r.trace };
  } catch (e) {
    if (!(e instanceof EngineError)) throw e;
    return { ...base, passed: false, actual: `ERROR ${e.code}`, trace: [] };
  }
}

export async function runCases(dir: string): Promise<CaseReport[]> {
  const names = (await readdir(dir)).filter((n) => n.endsWith(".json"));
  const reports: CaseReport[] = [];
  for (const name of names.sort()) {
    const text = await readFile(join(dir, name), "utf8");
    reports.push(execute(parseCase(name, text)));
  }
  return reports;
}
