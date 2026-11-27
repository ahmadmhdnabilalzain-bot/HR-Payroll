import { confirmations } from "../../demo/derive";
import { formatDate, formatDayMonth } from "../../i18n/format";
import { countOf } from "../../nav/registry";
import type { Area, NavCtx } from "../../nav/types";
import type { StatusTone } from "../../ui/templates";

/**
 * One line per Setup area for the Setup home: what is set there, or
 * where it stands. A live state wins (requests waiting, a connection
 * failing, a fund to confirm) and carries a status word with its dot;
 * otherwise the line says what the area holds, read from the data
 * where the data has it. No amounts and no names.
 */
export interface AreaSummary {
  text: string;
  /** Present only when there is a state to act on or a check done. */
  tone?: StatusTone;
}

type Line = string | ((c: NavCtx) => AreaSummary | string);

/** What each area holds, by area id (every Setup area has one). */
export const SETUP_LINES: Readonly<Record<string, Line>> = {
  "setup.custom-fields": "Extra fields on a person's record",
  "setup.jobs": "Job titles and grades",
  "setup.documents": "Which papers each person needs",
  "setup.letters": "Letters HR sends, with their wording",
  "setup.checklists": "Steps for joining and leaving",
  "setup.kpis": "Goals a manager can set",
  "setup.rule-packs": "The rules pay follows, each with its source",
  "setup.leave": "Leave types, days and carry-over",
  "setup.hours": "Working week and overtime limits",
  "setup.holidays": "Public holidays and Ramadan hours",
  "setup.devices": "Clocks that send punches",
  "setup.public-holidays": "This year's holidays on a calendar",
  "setup.paygroups": "Who is paid together, and when",
  "setup.payelements": (c) => confirmations(c.data).length > 0
    ? { text: "Pension fund to confirm", tone: "warn" }
    : "Allowances, deductions and how each is paid",
  "setup.eos": "Gratuity and final settlement",
  "setup.deductions": "Caps on what pay can be reduced by",
  "setup.calendar": (c) => `Payday ${formatDayMonth(
    c.data.payCalendar().payday, "en")}`,
  "setup.wps": "Salary file format and bank",
  "setup.exemptions": "People left out of a pay run, and why",
  "setup.rule-change": "No rule change waiting",
  "setup.users": "People who can sign in, and their roles",
  "setup.roles": "What each role may see and do",
  "setup.who": "Who holds each permission",
  "setup.rules": "Who signs off what",
  "setup.separation": "One person prepares, another signs off",
  "setup.signin": "Second sign-in step and single sign-on",
  "setup.review": (c) => {
    const r = c.data.home.it().review;
    return { text: `Last review ${formatDate(r.on, "en")}: ` +
      `${r.checked} users checked`, tone: "done" };
  },
  "setup.sign-off": "Amounts that need a second signer",
  "setup.access-requests": "No access request waiting",
  "setup.splits": "Ask to change who signs off",
  "setup.cover": "Who decides when someone is away",
  "setup.auditor": "Read-only access for an auditor",
  "setup.keys": (c) => {
    const n = c.data.home.it().keys.length;
    return n === 0 ? "No keys yet"
      : `${n} ${n === 1 ? "key" : "keys"}, read only`;
  },
  "setup.hooks": (c) => {
    const hooks = c.data.home.it().hooks;
    const bad = hooks.filter((h) => h.status === "failing").length;
    return bad > 0 ? { text: `${bad} of ${hooks.length} failing`,
      tone: "warn" }
      : { text: `All ${hooks.length} working`, tone: "done" };
  },
  "setup.whatsapp": "Decide requests from a WhatsApp message",
  "setup.calendar-feeds": "Leave and holidays in a calendar app",
  "setup.email-in": "Papers sent by email land on the record",
  "setup.erp": "People kept in step with the finance system",
  "setup.gl": "The payroll journal for the ledger",
  "setup.teams": "Decision messages in Teams",
  "setup.parallel": "Old payroll against this one, line by line",
  "setup.company": "Name, licence and addresses",
  "setup.import": "Bring people in from a spreadsheet",
  "setup.location": "Where the data is stored",
  "setup.privacy": "How long records are kept",
  "setup.privacy-register": "Which personal data is kept, and why",
  "setup.privacy-requests": "People asking to see or remove their data",
  "setup.privacy-run": "Records due for deletion",
  "setup.help": "Guides, and who to ask",
};

/** The area's line: its waiting count first, else what it holds. */
export function setupSummary(a: Area, c: NavCtx): AreaSummary {
  const n = countOf(a, c);
  if (n !== null) {
    return { text: `${n} waiting`, tone: a.stopsPay === true ? "stop"
      : "warn" };
  }
  const line = SETUP_LINES[a.id];
  if (line === undefined) return { text: "" };
  const v = typeof line === "string" ? line : line(c);
  return typeof v === "string" ? { text: v } : v;
}
