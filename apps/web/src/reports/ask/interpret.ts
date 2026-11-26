/**
 * X34: asking for a report in words, by rules. The words are matched
 * to the reports that exist (the catalogue and the templates' filters):
 * a short table of phrases per report, then the report names
 * themselves. A month or a cost centre in the words becomes the
 * report's filter where the report has one. No model is involved and
 * nothing is invented: what is not matched is said so, and the list of
 * reports is shown instead.
 */

/** A report the person may open, as the registry lists it. */
export interface ReportTarget {
  /** The registry area id, e.g. "reports.variance". */
  id: string;
  label: string;
  /** The route after "#/reports", e.g. ["variance"]. */
  rest: readonly string[];
}

export interface AskContext {
  reports: readonly ReportTarget[];
  months: readonly { value: string; label: string }[];
  departments: readonly { value: string; label: string }[];
  /** The pay run's month, "2026-10": what "this month" means. */
  runMonth: string;
}

export type Answer =
  | { kind: "match"; target: ReportTarget; rest: readonly string[];
    /** "September 2026", "Engineering", or "" when no filter. */
    filterText: string;
    /** Said under the result when the words asked for more than the
     * report can filter. */
    note: string }
  | { kind: "none" };

/** What a report can be set to from the words. */
const FILTER: Readonly<Record<string, "month" | "department">> = {
  "reports.variance": "month",
  "reports.inspection": "month",
  "reports.cost-budget": "department",
};

/** Phrases that point at a report. A phrase matches at the start of a
 * word, so "variances" and "overtimes" count. */
const PHRASES: readonly (readonly [string, readonly string[]])[] = [
  ["reports.variance", ["variance", "what changed", "why did pay",
    "changed against", "pay change", "against last month"]],
  ["reports.headcount", ["headcount", "head count", "how many people",
    "how many staff", "joiners", "leavers", "turnover", "starters"]],
  ["reports.overtime", ["overtime", "extra hours", "overtime cost"]],
  ["reports.summary", ["summary", "payroll summary", "this month s pay",
    "pay run total", "what does the run"]],
  ["reports.departments", ["cost by department", "department cost",
    "which department costs", "costs the most", "most expensive"]],
  ["reports.cost-budget", ["budget", "cost centre", "cost center",
    "against budget", "over budget"]],
  ["reports.trend", ["trend", "january to", "month by month",
    "over the year", "how has pay"]],
  ["reports.leave", ["leave", "time off", "holiday balance",
    "annual leave", "sick leave"]],
  ["reports.documents", ["visa", "emirates id", "passport", "expir"]],
  ["reports.nationality", ["nationality", "nationalities", "emiratis"]],
  ["reports.files", ["salary file", "wps", "files made", "sif"]],
  ["reports.anomalies", ["anomal", "unusual", "look different"]],
  ["reports.audit", ["audit", "who did what", "trail"]],
  ["reports.templates", ["template", "saved view", "my views"]],
  ["reports.inspection", ["inspection", "inspector", "evidence pack"]],
  ["reports.employer-cost", ["employer cost", "total cost of staff",
    "cost to the company"]],
  ["reports.gratuity-liability", ["gratuity", "end of service",
    "end-of-service"]],
  ["reports.forecast", ["forecast", "plan versus actual", "plan vs actual"]],
  ["reports.loans", ["loan", "advance"]],
  ["reports.journal", ["journal", "ledger posting"]],
  ["reports.elements", ["element", "pay element"]],
  ["reports.sign-offs", ["sign off", "signed off", "approval report"]],
  ["reports.safety-incidents", ["safety", "incident", "accident"]],
];

const STOP = new Set(["report", "reports", "the", "a", "of", "for", "by",
  "and", "show", "me", "my", "in", "on", "to", "what", "is", "are", "all"]);

const MONTHS = ["january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"];

const normal = (s: string): string => ` ${s.toLowerCase()
  .replace(/[^a-z0-9]+/g, " ").trim()} `;

const hit = (words: string, phrase: string): boolean =>
  words.includes(` ${phrase.replace(/[^a-z0-9]+/g, " ").trim()}`);

/** "2026-09" for "september", "sept", "last month", "this month". */
export function monthIn(words: string, c: AskContext): string | null {
  const keys = c.months.map((m) => m.value);
  const at = keys.indexOf(c.runMonth);
  const earlier = at < 0 ? null : keys[at + 1] ?? null;
  // The list is newest first: the month before the run is next in it.
  if (hit(words, "last month") || hit(words, "previous month")) {
    return earlier;
  }
  if (hit(words, "this month") || hit(words, "current month")) {
    return at < 0 ? null : keys[at] ?? null;
  }
  const word = (w: string): boolean => words.includes(` ${w} `);
  const n = MONTHS.findIndex((m) => word(m) || word(m.slice(0, 3)) ||
    (m === "september" && word("sept")));
  if (n < 0) return null;
  const two = String(n + 1).padStart(2, "0");
  return keys.find((k) => k.endsWith(`-${two}`)) ?? null;
}

/** The cost centre named in the words, by its name. */
export function departmentIn(words: string, c: AskContext): string | null {
  const found = c.departments.find((d) => {
    const name = normal(d.label).trim();
    return name !== "" && words.includes(` ${name} `);
  });
  return found?.value ?? null;
}

/** Score of a report: phrases count by their words, names by one. */
function score(words: string, id: string, label: string): number {
  const phrases = PHRASES.find((p) => p[0] === id)?.[1] ?? [];
  let n = 0;
  for (const ph of phrases) {
    if (hit(words, ph)) n = Math.max(n, 3 * ph.split(/\s+/).length);
  }
  if (n > 0) return n;
  const named = normal(label).trim().split(" ").filter((w) =>
    w.length > 3 && !STOP.has(w));
  return named.filter((w) => hit(words, w)).length;
}

export function interpret(query: string, c: AskContext): Answer {
  const words = normal(query);
  if (words.trim() === "") return { kind: "none" };
  let best: { t: ReportTarget; n: number } | null = null;
  for (const t of c.reports) {
    const n = score(words, t.id, t.label);
    if (n > 0 && (best === null || n > best.n)) best = { t, n };
  }
  if (best === null) return { kind: "none" };
  const target = best.t;
  const kind = FILTER[target.id];
  if (kind === "month") {
    const m = monthIn(words, c);
    const label = c.months.find((x) => x.value === m)?.label ?? "";
    return { kind: "match", target, filterText: label, note: "",
      rest: m === null ? target.rest : [...target.rest, m] };
  }
  if (kind === "department") {
    const d = departmentIn(words, c);
    const label = c.departments.find((x) => x.value === d)?.label ?? "";
    return { kind: "match", target, filterText: label, note: "",
      rest: d === null ? target.rest : [...target.rest, d] };
  }
  const m = monthIn(words, c);
  const asked = m !== null || departmentIn(words, c) !== null;
  return { kind: "match", target, filterText: "", rest: target.rest,
    note: asked ? `${target.label} has no filter for that, so it is ` +
      "shown whole." : "" };
}

/** Example phrases, from what the data holds. */
export function examples(c: AskContext): string[] {
  const n = Number(c.months[1]?.value.slice(5, 7));
  const month = MONTHS[n - 1];
  const dept = c.departments[0]?.label;
  return [
    ...(month === undefined ? [] : [`variance for ${month}`]),
    "headcount by department",
    "overtime this month",
    ...(dept === undefined ? [] : [`budget for ${dept.toLowerCase()}`]),
  ];
}
