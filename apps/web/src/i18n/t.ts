import { ar } from "./ar";
import { en, type EnCatalog } from "./en";
import type { Lang } from "./types";

type Value = string | Readonly<Record<string, string>>;

/** "namespace.key" for every message of the English catalog. */
export type MessageKey = {
  [N in keyof EnCatalog]: `${N & string}.${keyof EnCatalog[N] & string}`;
}[keyof EnCatalog];

export type Vars = Record<string, string | number>;
export type T = (key: MessageKey, vars?: Vars) => string;

/** `{ ns: { key: v } }` to `{ "ns.key": v }`. */
export function flatten(catalog: object): Record<string, Value> {
  const out: Record<string, Value> = {};
  for (const [ns, keys] of Object.entries(catalog)) {
    for (const [k, v] of Object.entries(keys as Record<string, Value>)) {
      out[`${ns}.${k}`] = v;
    }
  }
  return out;
}

const FLAT: Record<Lang, Record<string, Value>> = {
  en: flatten(en),
  ar: flatten(ar),
};

/** Unknown placeholders stay visible, so a missing var is noticed. */
function fill(text: string, vars: Vars): string {
  return text.replace(/\{(\w+)\}/g, (all, name: string) => {
    const v = vars[name];
    return v === undefined ? all : String(v);
  });
}

function pick(value: Value, lang: Lang, vars: Vars): string {
  if (typeof value === "string") return value;
  const count = Number(vars["count"] ?? Number.NaN);
  const rule = new Intl.PluralRules(lang === "ar" ? "ar" : "en")
    .select(count);
  return value[rule] ?? value["other"] ?? "";
}

export function hasMessage(key: string): key is MessageKey {
  return Object.hasOwn(FLAT.en, key);
}

export function createT(lang: Lang): T {
  return (key, vars = {}) => {
    const value = FLAT[lang][key];
    if (value === undefined) return key;
    return fill(pick(value, lang, vars), vars);
  };
}

/** The message for an API error code, else the generic message. */
export function errorText(e: { code: string }, t: T): string {
  const key = `errors.${e.code}`;
  return hasMessage(key) ? t(key) : t("errors.generic");
}
