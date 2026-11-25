import { EngineError } from "./errors";
import type { Lang } from "./explain/catalog";
import type { RuleChange } from "./preview";
import type { ParamValue } from "./rules/types";

export interface CliArgs {
  file: string;
  lang: Lang;
  change: RuleChange | null;
}

const bad = (why: string, value: string): EngineError =>
  new EngineError("INVALID_ARGS", why, { value });

function parseValue(text: string): ParamValue {
  if (/^\d+$/.test(text)) return Number(text);
  if (text === "true") return true;
  if (text === "false") return false;
  return text;
}

/** Parses `<packId>:<key>=<value>`. */
export function parseChange(text: string): RuleChange {
  const m = /^([^:=]+):([^:=]+)=(.+)$/.exec(text);
  if (!m) {
    throw bad("--change must look like <packId>:<key>=<value>", text);
  }
  return { packId: m[1] ?? "", key: m[2] ?? "",
    newValue: parseValue(m[3] ?? "") };
}

function parseLang(text: string | undefined): Lang {
  if (text === "en" || text === "ar") return text;
  throw bad("--lang must be en or ar", text ?? "");
}

export function parseArgs(args: string[]): CliArgs {
  const out: CliArgs = { file: "", lang: "en", change: null };
  const rest = args.filter((a) => a !== "--");
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i] ?? "";
    if (a === "--lang") out.lang = parseLang(rest[++i]);
    else if (a === "--change") {
      out.change = parseChange(rest[++i] ?? "");
    } else if (a.startsWith("-")) {
      throw bad(`unknown flag ${a}`, a);
    } else if (out.file === "") out.file = a;
    else throw bad("only one input file is allowed", a);
  }
  if (out.file === "") throw bad("missing input file", "");
  return out;
}
