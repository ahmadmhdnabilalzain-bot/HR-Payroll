import { addDays } from "@payroll/engine";
import { AS_OF } from "./calendar";

/**
 * WPE policy library (H15). FICTIONAL company policies, written for the
 * demo. Ask about a policy is RULE-BASED: a question is matched to the
 * sections by counting shared words, and the answer is the section text
 * quoted as written, with its number. Nothing is generated or guessed,
 * and no model is called. A statutory point sits in `note`, worded "as
 * we read it", and never claims that a policy meets a law.
 */

export interface PolicySection {
  /** Stable id, e.g. "leave-3-2". */
  id: string;
  /** Shown number, e.g. "3.2". */
  number: string;
  heading: string;
  text: string;
  /** An "as we read it" note on a statutory point, or null. */
  note: string | null;
}

export interface Policy {
  id: string;
  title: string;
  /** A job title, never a person. */
  owner: string;
  version: string;
  /** ISO date of the last review (before the demo's today). */
  reviewed: string;
  summary: string;
  sections: PolicySection[];
}

type Seed = [number: string, heading: string, text: string,
  note?: string];

interface PolicySeed {
  id: string;
  title: string;
  owner: string;
  version: string;
  daysAgo: number;
  summary: string;
  sections: Seed[];
}

const SEEDS: readonly PolicySeed[] = [
  { id: "leave", title: "Leave policy", owner: "HR manager",
    version: "3.1", daysAgo: 62,
    summary: "Annual, sick and other leave: how much, how to ask.",
    sections: [
      ["1.1", "Who this covers", "This policy covers every employee on " +
        "the company payroll, full time or part time."],
      ["2.1", "Annual leave", "Each employee earns annual leave in " +
        "calendar days, set in Setup, Leave rules. Weekends and public " +
        "holidays inside the dates are not counted.",
      "As we read it, the Labour Law sets a minimum for annual leave. " +
        "Check the rule in Setup and confirm with HR."],
      ["2.2", "Carrying leave over", "Unused annual leave may be carried " +
        "into the next year up to the limit in Setup. Leave above the " +
        "limit lapses on 31 December unless HR agrees otherwise in writing."],
      ["3.1", "Asking for leave", "Ask in the app under My leave, with " +
        "the dates. Your manager decides, and you see who decided and " +
        "when. Ask at least one week ahead for more than three days."],
      ["3.2", "Sick leave", "Tell your manager on the first morning you " +
        "are unwell. For more than two days in a row, add a medical " +
        "certificate from a licensed clinic to the request.",
      "As we read it, sick leave rules are set in law. HR holds the " +
        "current reading."],
      ["4.1", "Other leave", "Compassionate leave, study leave, comp-off " +
        "days and unpaid leave are asked for the same way and decided " +
        "by the manager and HR."],
    ] },
  { id: "overtime", title: "Overtime policy", owner: "HR manager",
    version: "2.0", daysAgo: 95,
    summary: "When extra hours are allowed and how they are recorded.",
    sections: [
      ["1.1", "Before you work extra hours", "Extra hours need your " +
        "manager's agreement before they are worked, in the app under " +
        "Time. Hours without agreement are not recorded as overtime."],
      ["2.1", "How overtime is recorded", "Overtime is counted from the " +
        "time card in hours, and your manager accepts or declines each " +
        "entry. Accepted hours go to the pay run for that month."],
      ["2.2", "Rest days and holidays", "Work on a weekly rest day or a " +
        "public holiday is recorded separately, and may be given as a " +
        "comp-off day instead of pay when HR and you agree.",
      "As we read it, the Labour Law sets higher rates for night, rest " +
        "day and holiday work. The rates in Setup are the ones used."],
      ["3.1", "Limits", "Overtime should stay occasional. A manager " +
        "who sees the same person on overtime every week should talk " +
        "to HR about cover."],
    ] },
  { id: "expenses", title: "Expenses policy", owner: "Finance manager",
    version: "1.4", daysAgo: 40,
    summary: "What can be claimed, with what proof, and by when.",
    sections: [
      ["1.1", "What can be claimed", "Costs paid by you for company " +
        "work: travel, a client meal, supplies bought for the team. " +
        "Personal costs and fines are never claimed."],
      ["2.1", "Proof", "Every claim needs a receipt or invoice in the " +
        "company's name where one exists. Add the photo to the claim in " +
        "the app under My expenses."],
      ["2.2", "Time limit", "Send a claim within 30 days of the cost. " +
        "Older claims need a note from your manager saying why."],
      ["3.1", "Who decides", "Your manager decides a claim first. " +
        "Claims above your manager's limit go on to Finance. The limits " +
        "are set per grade in Setup."],
      ["3.2", "Payment", "A decided claim is paid with the next " +
        "salary run, shown as its own line on your payslip."],
    ] },
  { id: "probation", title: "Probation policy", owner: "HR manager",
    version: "2.2", daysAgo: 120,
    summary: "The probation period, the review and how it ends.",
    sections: [
      ["1.1", "Length", "A new employee starts on probation. The " +
        "length is written in the offer and in Setup, and is never " +
        "longer than six months.",
      "As we read it, the Labour Law caps probation at six months."],
      ["2.1", "Review", "Your manager reviews you before the end of " +
        "probation. HR sends the manager a reminder before the review " +
        "date, and the manager records the outcome in the app."],
      ["2.2", "Outcome", "The outcome is confirmed, extended once, or " +
        "ended. An extension must stay inside the longest period in 1.1 " +
        "and is put in writing to you."],
      ["3.1", "Leave during probation", "Leave is earned from the first " +
        "day. Annual leave taken in the first months follows the Leave " +
        "policy, section 2.1."],
    ] },
  { id: "notice", title: "Notice period policy", owner: "HR manager",
    version: "1.8", daysAgo: 150,
    summary: "How much notice to give and what happens in the notice.",
    sections: [
      ["1.1", "Giving notice", "To resign, send your notice in the app " +
        "under My requests, or in writing to HR. The notice starts on " +
        "the day HR records it.",
      "As we read it, the notice period is set by the contract and the " +
        "Labour Law. HR confirms the days for each person."],
      ["1.2", "Length", "The notice period is written in your contract. " +
        "A person still in probation gives the shorter notice written " +
        "there."],
      ["2.1", "During notice", "You keep working and are paid as usual. " +
        "Leave in the notice period needs your manager and HR to agree."],
      ["2.2", "Handover", "Your manager agrees a handover list with you " +
        "in the first week of notice. Company items are returned on the " +
        "last working day."],
    ] },
  { id: "eos", title: "End of service policy", owner: "HR manager",
    version: "1.5", daysAgo: 85,
    summary: "How the final settlement is worked out and when it is paid.",
    sections: [
      ["1.1", "What the settlement holds", "The final settlement is " +
        "worked out when you leave. It holds the pay to the last day, " +
        "unused annual leave, and end of service gratuity where it is due.",
      "As we read it, gratuity follows the Labour Law. The working is " +
        "shown on the settlement screen, line by line."],
      ["1.2", "Timing", "HR prepares the settlement after the last " +
        "working day, and it is paid with the salary file or in a " +
        "separate file, as HR tells you."],
      ["2.1", "Deductions", "Only what you owe the company, such as an " +
        "unreturned item or an advance, may be taken off, and each line " +
        "is shown to you before payment."],
      ["2.2", "Exit steps", "Before the last day: return company items, " +
        "hand over, and finish the exit interview with HR."],
    ] },
  { id: "conduct", title: "Dress and conduct policy", owner: "HR manager",
    version: "2.1", daysAgo: 200,
    summary: "How we dress, behave and speak up.",
    sections: [
      ["1.1", "Dress", "Dress neatly and modestly for the office and " +
        "for client visits. Where a team has a uniform, wear it on duty."],
      ["1.2", "Behaviour", "Treat colleagues, clients and visitors " +
        "with respect. Harassment, threats and bullying are not allowed " +
        "and lead to a disciplinary process."],
      ["2.1", "Confidential information", "Do not share customer or " +
        "colleague information outside work. Do not copy it to personal " +
        "devices or accounts."],
      ["2.2", "Speaking up", "If you see something wrong, tell your " +
        "manager or HR. Nobody is treated unfairly for raising a concern " +
        "in good faith."],
    ] },
  { id: "hiring", title: "Hiring policy", owner: "Talent lead",
    version: "1.3", daysAgo: 73,
    summary: "Opening a job, choosing a person, making an offer.",
    sections: [
      ["1.1", "Opening a job", "A manager asks for a new job in the app " +
        "under Hiring, and the General manager signs the request off " +
        "before it is advertised."],
      ["1.2", "Choosing a person", "Interviews use the same questions " +
        "for each candidate for a job. At least two people score each " +
        "candidate and the scores are kept."],
      ["2.1", "Offers", "HR prepares the offer from the grade in Setup. " +
        "The General manager signs it. A candidate is told the offer " +
        "in writing."],
      ["2.2", "Papers before day one", "The new employee gives the " +
        "documents HR asks for. A visa and work permit are started by " +
        "HR once the offer is accepted.",
      "As we read it, a work permit must exist before work begins. HR " +
        "confirms each case."],
    ] },
];

/** The library, in the order shown. Pure: same list every time. */
export function policyLibrary(): Policy[] {
  return SEEDS.map((p): Policy => ({ id: p.id, title: p.title,
    owner: p.owner, version: p.version,
    reviewed: addDays(AS_OF, -p.daysAgo), summary: p.summary,
    sections: p.sections.map(([number, heading, text, note]) =>
      ({ id: `${p.id}-${number.replace(".", "-")}`, number, heading,
        text, note: note ?? null })) }));
}

export const POLICY_NOTE = "Answers quote our written policies. The " +
  "match is by shared words: no model reads or writes the answer. If " +
  "your question is not covered, ask HR.";

export const POLICY_NOT_COVERED = "Not covered in our policies";

export interface PolicyHit {
  policyId: string;
  policyTitle: string;
  sectionId: string;
  number: string;
  heading: string;
  /** The section text, exactly as written. */
  quote: string;
  note: string | null;
  /** "Leave policy, section 3.2". */
  citation: string;
  score: number;
}

export interface PolicyAnswer {
  covered: boolean;
  /** Best match first; at most three. */
  hits: PolicyHit[];
}

const STOP = new Set(["a", "an", "the", "is", "are", "am", "do", "does",
  "i", "my", "me", "we", "our", "you", "your", "can", "could", "how",
  "what", "when", "where", "who", "which", "why", "to", "of", "in", "on",
  "for", "and", "or", "if", "it", "be", "get", "have", "has", "that",
  "this", "with", "at", "by", "from", "about", "much", "many", "will",
  "should", "would", "any", "there", "so", "not", "no", "as", "than"]);

/** Lowercase words, short plural and -ing/-ed endings trimmed. */
export function policyWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]+/g) ?? [])
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => w.length > 5 && w.endsWith("ing") ? w.slice(0, -3)
      : w.length > 4 && w.endsWith("ed") ? w.slice(0, -2)
        : w.length > 3 && w.endsWith("es") ? w.slice(0, -2)
          : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
}

/** Words that mean the same in our policies, so a question still finds. */
const SAME: Readonly<Record<string, string>> = { vacation: "leave",
  holiday: "leave", sick: "sick", ill: "sick", unwell: "sick",
  resign: "notice", quit: "notice", resignation: "notice",
  gratuity: "service", settlement: "service", firing: "end",
  fired: "end", claim: "expense", reimburse: "expense",
  reimbursement: "expense", receipt: "expense", overtime: "overtime",
  extra: "overtime", dress: "dress", wear: "dress", uniform: "dress",
  recruit: "hire", recruitment: "hire", interview: "hire",
  candidate: "hire", hiring: "hire", offer: "hire", long: "length",
  duration: "length" };

const norm = (w: string): string => SAME[w] ?? w;

const SECTION_MIN = 2;

/** Score of one section against a question: heading words count three
 * times, the policy title twice, the section text once. */
function score(q: Set<string>, p: Policy, s: PolicySection): number {
  const count = (text: string, weight: number): number => {
    const words = new Set(policyWords(text).map(norm));
    let n = 0;
    q.forEach((w) => { if (words.has(w)) n += weight; });
    return n;
  };
  return count(s.heading, 3) + count(p.title, 2) + count(s.text, 1);
}

/** Match a question to the sections. Same question, same answer. */
export function askPolicies(question: string): PolicyAnswer {
  const q = new Set(policyWords(question).map(norm));
  if (q.size === 0) return { covered: false, hits: [] };
  const all = policyLibrary().flatMap((p) => p.sections.map((s) =>
    ({ p, s, n: score(q, p, s) })));
  const hits = all.filter((x) => x.n >= SECTION_MIN)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3).map((x): PolicyHit => ({ policyId: x.p.id,
      policyTitle: x.p.title, sectionId: x.s.id, number: x.s.number,
      heading: x.s.heading, quote: x.s.text, note: x.s.note,
      citation: `${x.p.title}, section ${x.s.number}`, score: x.n }));
  return { covered: hits.length > 0, hits };
}

/** One policy by id, or null. */
export function policyById(id: string): Policy | null {
  return policyLibrary().find((p) => p.id === id) ?? null;
}
