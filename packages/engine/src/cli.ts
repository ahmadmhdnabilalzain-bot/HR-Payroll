import { readFile } from "node:fs/promises";
import { parseArgs, type CliArgs } from "./cli-args";
import { EngineError } from "./errors";
import { LTR_ISOLATE, type Lang } from "./explain/catalog";
import { CLI_TEXT } from "./explain/cli-text";
import { explainTrace } from "./explain/explain";
import { formatAed, parseAed, type Fils } from "./money";
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

/** Left-to-right text (amounts, rule names) kept intact in Arabic. */
function ltr(text: string, lang: Lang): string {
  const [open, close] = LTR_ISOLATE[lang];
  return open + text + close;
}

const aed = (amount: Fils, lang: Lang): string => ltr(formatAed(amount), lang);

function hypothetical(input: SettlementInput, args: CliArgs): string[] {
  if (args.change === null) return [];
  const p = previewRuleChange(input, GRATUITY_PACKS, args.change);
  const c = args.change;
  const t = CLI_TEXT[args.lang];
  const what = `${c.packId}:${c.key}=${String(c.newValue)}`;
  return [
    "",
    `${t.hypothetical} ${ltr(what, args.lang)}`,
    `${t.before} ${aed(p.before.value.total, args.lang)}`,
    `${t.after} ${aed(p.after.value.total, args.lang)}`,
    `${t.delta} ${aed(p.delta, args.lang)}`,
  ];
}

function notComputed(items: string[], lang: Lang): string {
  const t = CLI_TEXT[lang];
  const words = items.map((i) => t.items[i] ?? i);
  return `${t.notComputed} ${words.join(t.listSeparator)}`;
}

async function render(args: CliArgs): Promise<string> {
  const input = await loadInput(args.file);
  const r = calculateSettlement(input, GRATUITY_PACKS);
  return [
    `${CLI_TEXT[args.lang].total} ${aed(r.value.total, args.lang)}`,
    "",
    explainTrace(r.trace, args.lang),
    "",
    notComputed(r.value.notComputed, args.lang),
    ...hypothetical(input, args),
  ].join("\n");
}

const oneLine = (text: string): string => text.replace(/\s+/g, " ").trim();

/** key=value; a value with spaces, quotes or "=" is JSON-quoted. */
function pair(key: string, value: string): string {
  const v = oneLine(value);
  return `${key}=${/^[^\s"=]+$/.test(v) ? v : JSON.stringify(v)}`;
}

/** CODE: message key=value ..., always on one line. */
export function formatError(e: EngineError): string {
  const pairs = Object.entries(e.detail).map(([k, v]) => pair(k, v));
  return [`${e.code}: ${oneLine(e.message)}`, ...pairs].join(" ");
}

export async function runCli(args: string[]): Promise<CliResult> {
  try {
    return { code: 0, out: await render(parseArgs(args)) };
  } catch (e) {
    if (e instanceof EngineError) return { code: 1, out: formatError(e) };
    throw e;
  }
}
