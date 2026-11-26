import {
  MERGE_FIELDS,
  PLACEHOLDER,
  type TemplateBody,
} from "@payroll/contract";
import { ApiError } from "../http/errors";

/** A run of letter text; `isolate` keeps dates and money left to right. */
export interface Segment {
  text: string;
  isolate: boolean;
}

export interface MergedBody {
  title: Segment[];
  paragraphs: Segment[][];
}

const FIELDS = new Map(MERGE_FIELDS.map((f) => [f.key, f]));

/** A fresh copy each time: the exported pattern is global (stateful). */
const pattern = () => new RegExp(PLACEHOLDER.source, "g");

/** Placeholder keys in `text`, sorted and unique. */
export function placeholders(text: string): string[] {
  const keys = [...text.matchAll(pattern())].map((m) => m[1]!);
  return [...new Set(keys)].sort();
}

const textsOf = (b: TemplateBody) => [b.title, ...b.paragraphs];

/**
 * The fields a template uses and whether any is a salary field. Any
 * `{{` outside a well-formed placeholder is MALFORMED_PLACEHOLDER;
 * unknown keys are UNKNOWN_MERGE_FIELD (all of them, sorted).
 */
export function validateTemplateBody(b: TemplateBody)
  : { fields: string[]; usesSalary: boolean } {
  for (const t of textsOf(b)) {
    if (t.replace(pattern(), "").includes("{{")) {
      throw new ApiError("MALFORMED_PLACEHOLDER");
    }
  }
  const fields = placeholders(textsOf(b).join("\n"));
  const unknown = fields.filter((k) => !FIELDS.has(k));
  if (unknown.length > 0) {
    throw new ApiError("UNKNOWN_MERGE_FIELD", undefined,
      { fields: unknown });
  }
  return { fields,
    usesSalary: fields.some((k) => FIELDS.get(k)!.salary) };
}

const present = (v: string | undefined): v is string =>
  v !== undefined && v.trim() !== "";

/**
 * One pass over the template text only: literal runs and value runs.
 * An inserted value is never scanned again, so a value that looks
 * like a placeholder stays literal text.
 */
function split(text: string, values: Readonly<Record<string, string>>,
  missing: Set<string>): Segment[] {
  const out: Segment[] = [];
  let at = 0;
  for (const m of text.matchAll(pattern())) {
    if (m.index > at) out.push({ text: text.slice(at, m.index),
      isolate: false });
    const key = m[1]!;
    const v = values[key];
    if (!present(v)) missing.add(key);
    const kind = FIELDS.get(key)?.kind ?? "text";
    out.push({ text: v ?? "", isolate: kind !== "text" });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at), isolate: false });
  return out;
}

/** Merges values into a template; every missing key in one 422. */
export function mergeTemplate(b: TemplateBody,
  values: Readonly<Record<string, string>>): MergedBody {
  const missing = new Set<string>();
  const title = split(b.title, values, missing);
  const paragraphs = b.paragraphs.map((p) => split(p, values, missing));
  if (missing.size > 0) {
    throw new ApiError("MERGE_VALUE_MISSING", undefined,
      { fields: [...missing].sort() });
  }
  return { title, paragraphs };
}

export function segmentsText(s: readonly Segment[]): string {
  return s.map((x) => x.text).join("");
}
