import { formatAed, fils } from "../money";
import type { TraceLine } from "../trace-types";
import {
  LTR_ISOLATE,
  MESSAGES,
  MONEY_IDS,
  STATUS_WORDS,
  UNTRANSLATED,
  YEARS_TEXT,
  type Lang,
} from "./catalog";

function statusList(line: TraceLine, lang: Lang): string {
  const words = STATUS_WORDS[lang];
  const seen = [...new Set(line.rules.map((r) => r.status))];
  if (seen.length === 0) return words["none"] ?? "";
  return seen.map((s) => words[s] ?? s).join(", ");
}

const YEARS_PATTERN = /^(\d+) years and (\d+) days$/;

function resultText(line: TraceLine, lang: Lang): string {
  if (MONEY_IDS.includes(line.id) && /^-?\d+$/.test(line.result)) {
    const [open, close] = LTR_ISOLATE[lang];
    return open + formatAed(fils(BigInt(line.result))) + close;
  }
  const m = line.id === "service.years" ? YEARS_PATTERN.exec(line.result)
    : null;
  if (m === null) return line.result;
  return YEARS_TEXT[lang].replace("{y}", m[1] ?? "")
    .replace("{d}", m[2] ?? "");
}

const ZERO_OUTCOMES: readonly string[] = ["not-eligible", "not-applicable"];

/** A zero gratuity line has its own message that states the reason. */
function messageKey(line: TraceLine): string {
  const outcome = line.inputs["outcome"] ?? "";
  return line.id === "gratuity.total" && ZERO_OUTCOMES.includes(outcome)
    ? `${line.id}.${outcome}` : line.id;
}

function explainLine(line: TraceLine, lang: Lang): string {
  const template = MESSAGES[lang][messageKey(line)];
  const rules = statusList(line, lang);
  if (template === undefined) {
    return `${line.label}: ${line.result} (${rules}) ${UNTRANSLATED}`;
  }
  // One pass, so text substituted in is never scanned again.
  return template.replace(/\{(result|rules|in\.\w+)\}/g,
    (all, name: string) => {
      if (name === "result") return resultText(line, lang);
      if (name === "rules") return rules;
      return line.inputs[name.slice(3)] ?? all;
    });
}

export function explainTrace(trace: TraceLine[], lang: Lang): string {
  return trace.map((line) => explainLine(line, lang)).join("\n");
}
