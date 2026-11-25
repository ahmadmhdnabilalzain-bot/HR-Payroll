import { readFile } from "node:fs/promises";
import { parseArgs, type CliArgs } from "./cli-args";
import { EngineError } from "./errors";
import { explainTrace } from "./explain/explain";
import { formatAed, parseAed } from "./money";
import { previewRuleChange } from "./preview";
import { GRATUITY_PACKS } from "./rules/gratuity-pack";
import { SampleSchema } from "./sample-schema";
import {
  calculateSettlement,
  type SettlementInput,
} from "./settlement";

export interface CliResult {
  code: number;
  out: string;
}

const invalid = (file: string, why: string): EngineError =>
  new EngineError("INVALID_INPUT_FILE", `${file}: ${why}`, { file, why });

async function loadInput(file: string): Promise<SettlementInput> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    throw invalid(file, "cannot read file");
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw invalid(file, "not valid JSON");
  }
  const parsed = SampleSchema.safeParse(json);
  if (!parsed.success) throw invalid(file, parsed.error.message);
  const s = parsed.data;
  return {
    unusedLeaveDays: s.unusedLeaveDays,
    gratuity: {
      joiningDate: s.joiningDate,
      lastWorkingDate: s.lastWorkingDate,
      unpaidLeaveDays: s.unpaidLeaveDays,
      lastBasicMonthly: parseAed(s.basicMonthlyAed),
      workerClass: s.workerClass,
    },
  };
}

function hypothetical(input: SettlementInput, args: CliArgs): string[] {
  if (args.change === null) return [];
  const p = previewRuleChange(input, GRATUITY_PACKS, args.change);
  const c = args.change;
  return [
    "",
    `HYPOTHETICAL (not law): ${c.packId}:${c.key}=${String(c.newValue)}`,
    `Before: ${formatAed(p.before.value.total)}`,
    `After: ${formatAed(p.after.value.total)}`,
    `Delta: ${formatAed(p.delta)}`,
  ];
}

async function render(args: CliArgs): Promise<string> {
  const input = await loadInput(args.file);
  const r = calculateSettlement(input, GRATUITY_PACKS);
  return [
    `Settlement total: ${formatAed(r.value.total)}`,
    "",
    explainTrace(r.trace, args.lang),
    "",
    `Not computed: ${r.value.notComputed.join(", ")}`,
    ...hypothetical(input, args),
  ].join("\n");
}

export async function runCli(args: string[]): Promise<CliResult> {
  try {
    return { code: 0, out: await render(parseArgs(args)) };
  } catch (e) {
    if (e instanceof EngineError) {
      return { code: 1, out: `${e.code}: ${e.message}` };
    }
    throw e;
  }
}
