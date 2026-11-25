import { formatAed, fils } from "../money";
import type { TraceLine } from "../trace-types";
import {
  MESSAGES,
  MONEY_IDS,
  STATUS_WORDS,
  UNTRANSLATED,
  type Lang,
} from "./catalog";

function statusList(line: TraceLine, lang: Lang): string {
  const words = STATUS_WORDS[lang];
  const seen = [...new Set(line.rules.map((r) => r.status))];
  if (seen.length === 0) return words["none"] ?? "";
  return seen.map((s) => words[s] ?? s).join(", ");
}

function resultText(line: TraceLine): string {
  return MONEY_IDS.has(line.id) && /^-?\d+$/.test(line.result)
    ? formatAed(fils(BigInt(line.result)))
    : line.result;
}

function explainLine(line: TraceLine, lang: Lang): string {
  const template = MESSAGES[lang][line.id];
  const rules = statusList(line, lang);
  if (template === undefined) {
    return `${line.label}: ${line.result} (${rules}) ${UNTRANSLATED}`;
  }
  return template
    .replace("{result}", () => resultText(line))
    .replace("{rules}", () => rules);
}

export function explainTrace(trace: TraceLine[], lang: Lang): string {
  return trace.map((line) => explainLine(line, lang)).join("\n");
}
