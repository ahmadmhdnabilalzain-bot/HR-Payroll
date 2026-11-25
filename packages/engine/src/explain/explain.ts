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

function explainLine(line: TraceLine, lang: Lang): string {
  const template = MESSAGES[lang][line.id];
  const rules = statusList(line, lang);
  if (template === undefined) {
    return `${line.label}: ${line.result} (${rules}) ${UNTRANSLATED}`;
  }
  return template
    .replace("{result}", () => resultText(line, lang))
    .replace("{rules}", () => rules);
}

export function explainTrace(trace: TraceLine[], lang: Lang): string {
  return trace.map((line) => explainLine(line, lang)).join("\n");
}
