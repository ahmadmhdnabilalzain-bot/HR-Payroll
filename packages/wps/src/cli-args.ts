import { EngineError } from "@payroll/engine";

export type CliArgs =
  | { readonly command: "generate"; readonly file: string;
    readonly out: string }
  | { readonly command: "check"; readonly file: string;
    readonly today: string | null };

export const DEFAULT_OUT = "out";

const USAGE = "usage: generate <batch.json> [--out dir] | " +
  "check <file.SIF> [--today YYYY-MM-DD]";

const bad = (why: string, value: string): EngineError =>
  new EngineError("INVALID_ARGS", `${why}; ${USAGE}`, { value });

interface Raw {
  file: string;
  flags: Map<string, string>;
}

function scan(rest: readonly string[]): Raw {
  const raw: Raw = { file: "", flags: new Map() };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i] ?? "";
    if (a === "--out" || a === "--today") {
      const v = rest[++i];
      if (v === undefined) throw bad(`${a} needs a value`, a);
      raw.flags.set(a, v);
    } else if (a.startsWith("-")) {
      throw bad(`unknown flag ${a}`, a);
    } else if (raw.file === "") raw.file = a;
    else throw bad("only one input file is allowed", a);
  }
  if (raw.file === "") throw bad("missing input file", "");
  return raw;
}

function only(raw: Raw, allowed: string, command: string): void {
  for (const flag of raw.flags.keys()) {
    if (flag !== allowed) throw bad(`${flag} is not for ${command}`, flag);
  }
}

/** `generate <batch.json> [--out dir]` or `check <file> [--today d]`. */
export function parseArgs(args: readonly string[]): CliArgs {
  const [command, ...rest] = args.filter((a) => a !== "--");
  if (command !== "generate" && command !== "check") {
    throw bad("first word must be generate or check", command ?? "");
  }
  const raw = scan(rest);
  if (command === "generate") {
    only(raw, "--out", command);
    return { command, file: raw.file,
      out: raw.flags.get("--out") ?? DEFAULT_OUT };
  }
  only(raw, "--today", command);
  return { command, file: raw.file,
    today: raw.flags.get("--today") ?? null };
}
