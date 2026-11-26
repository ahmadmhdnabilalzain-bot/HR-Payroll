import {
  IsoDate,
  TEMPLATE_TERMS,
  TEMPLATES,
  type NotificationKind,
  type TemplateVar,
  type TermKey,
} from "@payroll/contract";
import { CodedError } from "../coded-error";

type Lang = "en" | "ar";

export interface Rendered {
  subject: string;
  body: string;
  language: Lang;
  languageFallback: boolean;
}

const forbidden = (why: string) =>
  new CodedError("TEMPLATE_VAR_FORBIDDEN", why);

/** Money, an IBAN, a 14-digit id or an Emirates ID number. */
export function looksProtected(s: string): boolean {
  return /^\d[\d,]*\.\d{2}$/.test(s) || /AE\d{2}/i.test(s) ||
    /\d{14}/.test(s) || /784\d{12}/.test(s);
}

function cleanText(v: string): string {
  // eslint-disable-next-line no-control-regex
  const clean = v.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 80);
  if (looksProtected(clean) || looksProtected(v.replace(/\s/g, ""))) {
    throw forbidden("text value looks protected");
  }
  return clean;
}

function value(kind: NotificationKind, v: TemplateVar, raw: string,
  lang: Lang): string {
  switch (v.kind) {
    case "text": return cleanText(raw);
    case "date":
      if (!IsoDate.safeParse(raw).success) throw forbidden("not a date");
      return raw;
    case "code":
      if (kind !== "channel-verify-code" || !/^\d{6}$/.test(raw)) {
        throw forbidden("code");
      }
      return raw;
    case "term": {
      const t = TEMPLATE_TERMS[raw as TermKey];
      if (t === undefined || !raw.startsWith(v.prefix)) {
        throw forbidden("unknown term");
      }
      return t[lang];
    }
  }
}

/** The declared vars rendered in declaration order. */
function values(kind: NotificationKind, vars: Record<string, string>,
  lang: Lang): [string, string][] {
  const decl = TEMPLATES[kind].vars;
  for (const k of Object.keys(vars)) {
    if (!(k in decl)) throw forbidden(`undeclared var ${k}`);
  }
  return Object.entries(decl).map(([k, v]) => {
    const raw = vars[k];
    if (raw === undefined) {
      throw new CodedError("TEMPLATE_VAR_MISSING", `missing var ${k}`);
    }
    return [k, value(kind, v, raw, lang)];
  });
}

const fill = (text: string, vals: [string, string][]) =>
  vals.reduce((t, [k, v]) => t.split(`{${k}}`).join(v), text);

/**
 * Pure. Unreviewed Arabic is never rendered: the English copy is
 * returned with `languageFallback: true`.
 */
export function renderTemplate(kind: NotificationKind, lang: Lang,
  vars: Record<string, string>): Rendered {
  const t = TEMPLATES[kind];
  const out: Lang = lang === "ar" && t.arReviewed ? "ar" : "en";
  const vals = values(kind, vars, out);
  const copy = t[out];
  return { subject: fill(copy.subject, vals), body: fill(copy.body, vals),
    language: out, languageFallback: out !== lang };
}

/** WhatsApp body parameters: the rendered values in declared order. */
export function whatsappParams(kind: NotificationKind, lang: Lang,
  vars: Record<string, string>): string[] {
  const t = TEMPLATES[kind];
  const out: Lang = lang === "ar" && t.arReviewed ? "ar" : "en";
  return values(kind, vars, out).map(([, v]) => v);
}
