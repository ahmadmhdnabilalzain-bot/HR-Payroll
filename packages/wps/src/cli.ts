import { EngineError } from "@payroll/engine";
import { formatError } from "@payroll/engine/shell";
import { parseBatch } from "./batch-schema";
import { parseArgs } from "./cli-args";
import type { Finding } from "./findings";
import { generateSif } from "./generate";
import { defaultLayout } from "./layout";
import { renderReport } from "./report";
import { validateSif } from "./validate";

/**
 * Everything the demo command touches outside itself. main.ts passes
 * the real files and clock (shell.ts); tests pass memory and a fixed
 * date, so no test needs a process or the real date.
 */
export interface CliIo {
  read(path: string): Promise<string>;
  /** Writes `name` under `dir` and returns the path written. */
  write(dir: string, name: string, text: string): Promise<string>;
  /** Today's date, YYYY-MM-DD. */
  today(): string;
}

export interface CliResult {
  code: number;
  out: string;
}

async function readInput(io: CliIo, file: string): Promise<string> {
  try {
    return await io.read(file);
  } catch {
    throw new EngineError("INVALID_INPUT_FILE", `${file}: cannot read file`,
      { file });
  }
}

function parseJson(text: string, file: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new EngineError("INVALID_BATCH_FILE", `${file}: not valid JSON`,
      { file });
  }
}

const hasErrors = (fs: readonly Finding[]): boolean =>
  fs.some((f) => f.severity === "error");

const report = (fs: readonly Finding[], name: string): string =>
  renderReport(fs, name).trimEnd();

async function generate(
  io: CliIo, file: string, out: string,
): Promise<CliResult> {
  const json = parseJson(await readInput(io, file), file);
  const sif = generateSif(parseBatch(json, file), defaultLayout);
  const findings = validateSif(sif.text, defaultLayout, io.today());
  const text = report(findings, sif.fileName);
  if (hasErrors(findings)) {
    return { code: 1,
      out: `${text}\n\nNot written: the generated file has errors.` };
  }
  let path: string;
  try {
    path = await io.write(out, sif.fileName, sif.text);
  } catch {
    throw new EngineError("CANNOT_WRITE", `cannot write to ${out}`,
      { dir: out, file: sif.fileName });
  }
  return { code: 0, out: `${text}\n\nWrote ${path}` };
}

async function check(
  io: CliIo, file: string, today: string | null,
): Promise<CliResult> {
  const text = await readInput(io, file);
  const findings = validateSif(text, defaultLayout, today ?? io.today());
  return { code: hasErrors(findings) ? 1 : 0, out: report(findings, file) };
}

/**
 * The `sif` and `sif:check` commands. Exit code 1 on any error (input,
 * generation or a finding of severity error); warnings alone give 0.
 */
export async function runCli(
  args: readonly string[],
  io: CliIo,
): Promise<CliResult> {
  try {
    const a = parseArgs(args);
    return a.command === "generate"
      ? await generate(io, a.file, a.out)
      : await check(io, a.file, a.today);
  } catch (e) {
    if (e instanceof EngineError) return { code: 1, out: formatError(e) };
    throw e;
  }
}
