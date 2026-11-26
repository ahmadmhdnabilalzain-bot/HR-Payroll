import { addDays, daysBetween } from "@payroll/engine";
import { AS_OF, workingDaysBetween } from "./calendar";
import { plural, type DisplayDate } from "./display";
import { HQ } from "./roster-data";
import type { DemoCompany, DemoEmployee } from "./types";
import { goalViews } from "./wp2";
import {
  departmentText,
  dueTextOf,
  jobTitleText,
  shortDateOf,
  shortDateText,
} from "./wp3";
import { employedIn } from "./payroll";

/**
 * WPD talent: skills, training and engagement surveys. FICTIONAL
 * sample data. Nothing is typed per person: levels come from years in
 * the bank, training dates from fixed calendar slots, survey answers
 * only as company totals with a minimum group size. Training records
 * are completion records kept by the bank; no outside body is named
 * and nothing is claimed as certified. Unlocks map rows P63, P64, P65.
 */

const yearsAt = (e: DemoEmployee, on: string = AS_OF): number =>
  Math.floor(daysBetween(e.joiningDate, on) / 365);
const active = (c: DemoCompany): DemoEmployee[] =>
  c.employees.filter((e) => e.leavingDate === null);

/* ---------------------------------------------------------------- *
 * P63 Skills
 * ---------------------------------------------------------------- */

export interface SkillItem { id: string; name: string; family: string }

export const SKILLS: readonly SkillItem[] = [
  { id: "sk-customer", name: "Customer service", family: "Branch" },
  { id: "sk-cash", name: "Cash and counter control", family: "Branch" },
  { id: "sk-payments", name: "Payments handling", family: "Operations" },
  { id: "sk-recon", name: "Reconciliation", family: "Operations" },
  { id: "sk-credit", name: "Credit analysis", family: "Credit" },
  { id: "sk-clients", name: "Client relationships", family: "Corporate" },
  { id: "sk-aml", name: "Anti-money-laundering checks",
    family: "Compliance" },
  { id: "sk-reporting", name: "Management reporting", family: "Finance" },
  { id: "sk-people", name: "People records and pay", family: "HR" },
  { id: "sk-systems", name: "Systems administration", family: "IT" },
  { id: "sk-leading", name: "Leading a team", family: "Management" },
  { id: "sk-data", name: "Customer data protection", family: "All staff" },
];

const DEPT_SKILLS: Record<string, string[]> = {
  exec: ["sk-reporting"], retail: ["sk-customer", "sk-cash"],
  corp: ["sk-clients", "sk-credit"], ops: ["sk-payments", "sk-recon"],
  credit: ["sk-credit", "sk-aml"], compliance: ["sk-aml", "sk-reporting"],
  fin: ["sk-reporting", "sk-recon"], hr: ["sk-people"],
  it: ["sk-systems"],
};

export const SKILL_BASIS = "Levels worked out from years in the " +
  "bank (under 1 year is level 1, 1 to 2 is 2, 3 to 6 is 3, 7 and more " +
  "is 4). Required level follows grade (up to 3 is 2, 4 to 6 is 3, 7 and " +
  "above is 4). They stand in until managers record assessed levels.";

const heldLevel = (years: number): number => years < 1 ? 1
  : years < 3 ? 2 : years < 7 ? 3 : 4;
const requiredLevel = (grade: number): number => grade <= 3 ? 2
  : grade <= 6 ? 3 : 4;

export interface SkillCell { skillId: string; name: string;
  required: number; held: number; gap: number;
  display: { level: string } }

export interface SkillRow { employeeId: string; name: string;
  jobText: string; departmentId: string; skills: SkillCell[];
  gaps: number }

/** The skills for a person: their department's, plus the shared ones. */
export function skillIdsFor(e: DemoEmployee): string[] {
  const code = e.departmentId.replace(/^dept-/, "");
  return [...(DEPT_SKILLS[code] ?? []), ...(e.grade >= 7 ? ["sk-leading"]
    : []), "sk-data"];
}

export function skillMatrix(c: DemoCompany): SkillRow[] {
  return active(c).map((e) => {
    const held = heldLevel(yearsAt(e));
    const required = requiredLevel(e.grade);
    const skills = skillIdsFor(e).map((id) => {
      const gap = Math.max(0, required - held);
      return { skillId: id, name: SKILLS.find((s) => s.id === id)!.name,
        required, held, gap, display: { level:
          `Level ${held} of ${required} needed` } };
    });
    return { employeeId: e.id, name: e.fullName,
      jobText: jobTitleText(e.jobKey), departmentId: e.departmentId,
      skills, gaps: skills.filter((s) => s.gap > 0).length };
  });
}

export interface SkillSummary { skillId: string; name: string;
  family: string; people: number; withGap: number;
  display: { people: string; gaps: string } }

export function skillSummary(c: DemoCompany): SkillSummary[] {
  const rows = skillMatrix(c);
  return SKILLS.map((s) => {
    const cells = rows.flatMap((r) => r.skills.filter((x) =>
      x.skillId === s.id));
    const gaps = cells.filter((x) => x.gap > 0).length;
    return { ...s, skillId: s.id, people: cells.length, withGap: gaps,
      display: { people: plural(cells.length, "person", "people"),
        gaps: gaps === 0 ? "No gaps" : plural(gaps, "gap", "gaps") } };
  });
}

/* ---------------------------------------------------------------- *
 * P64 Training
 * ---------------------------------------------------------------- */

export type TrainingStatus = "done" | "scheduled" | "to-do";

export interface TrainingCourse { id: string; name: string;
  provider: string; mandatory: boolean; repeatDays: number | null;
  audience: string }

const PROVIDER = "Zarqan Demo Academy";

export const TRAINING_COURSES: readonly TrainingCourse[] = [
  { id: "tr-induction", name: "Bank induction", provider: PROVIDER,
    mandatory: true, repeatDays: null, audience: "New joiners, within 30 " +
      "days" },
  { id: "tr-aml", name: "Anti-money-laundering refresher",
    provider: PROVIDER, mandatory: true, repeatDays: 365,
    audience: "Retail, corporate, operations, credit, compliance" },
  { id: "tr-data", name: "Customer data protection", provider: PROVIDER,
    mandatory: true, repeatDays: 365, audience: "All staff" },
  { id: "tr-fire", name: "Fire safety briefing", provider: PROVIDER,
    mandatory: true, repeatDays: 365, audience: "Head office staff" },
  { id: "tr-lead", name: "Leading a team", provider: PROVIDER,
    mandatory: false, repeatDays: null, audience: "Grades 7 to 9" },
];

export const FIRE_BRIEFING = { on: "2026-11-04", time: "10:00" } as const;
export const LEADERSHIP_SESSION = { on: "2026-11-24", time: "09:30" } as
  const;
const AML_DEPTS = ["retail", "corp", "ops", "credit", "compliance"];

export interface TrainingRecord {
  id: string;
  courseId: string;
  courseName: string;
  employeeId: string;
  name: string;
  status: TrainingStatus;
  completedOn: DisplayDate | null;
  dueOn: DisplayDate | null;
  sessionOn: DisplayDate | null;
  nextDueOn: DisplayDate | null;
  display: { status: string; when: string };
}

const pad = (n: number): string => String(n).padStart(3, "0");
const numberOf = (e: DemoEmployee): number => Number(e.id.slice(4));

/** A weekday slot in a fixed window, picked by the employee's number. */
const slot = (from: string, to: string, e: DemoEmployee): string => {
  const days = workingDaysBetween(from, to);
  return days[numberOf(e) % days.length]!;
};

interface Plan { courseId: string; e: DemoEmployee; status:
  TrainingStatus; on: string | null; due: string | null }

function plansFor(e: DemoEmployee): Plan[] {
  const code = e.departmentId.replace(/^dept-/, "");
  const out: Plan[] = [];
  const due30 = addDays(e.joiningDate, 30);
  const doneOrDue = (courseId: string, from: string, to: string,
    dueDays: number): void => {
    const on = slot(from, to, e);
    if (e.joiningDate > on) {
      out.push({ courseId, e, status: "to-do", on: null,
        due: addDays(e.joiningDate, dueDays) });
    } else out.push({ courseId, e, status: "done", on, due: null });
  };
  if (e.joiningDate >= "2026-01-01") {
    out.push(e.joiningDate <= addDays(AS_OF, -30)
      ? { courseId: "tr-induction", e, status: "done",
        on: addDays(e.joiningDate, 12), due: null }
      : { courseId: "tr-induction", e, status: "to-do", on: null,
        due: due30 });
  }
  if (AML_DEPTS.includes(code)) {
    doneOrDue("tr-aml", "2026-03-02", "2026-03-20", 60);
  }
  doneOrDue("tr-data", "2026-05-04", "2026-05-22", 60);
  if (e.location === HQ) {
    out.push({ courseId: "tr-fire", e, status: "scheduled",
      on: FIRE_BRIEFING.on, due: null });
  }
  if (e.grade >= 7 && e.grade <= 9) {
    out.push({ courseId: "tr-lead", e, status: "scheduled",
      on: LEADERSHIP_SESSION.on, due: null });
  }
  return out;
}

/** Every record, for staff still at the bank on the demo day. */
export function trainingRecords(c: DemoCompany, f: { employeeId?: string;
  courseId?: string } = {}): TrainingRecord[] {
  const plans = active(c).flatMap(plansFor);
  return plans.map((p, i): TrainingRecord => {
    const course = TRAINING_COURSES.find((x) => x.id === p.courseId)!;
    const repeat = course.repeatDays;
    const next = p.status === "done" && repeat !== null
      ? addDays(p.on!, repeat) : null;
    const when = p.status === "done"
      ? `Completed ${shortDateText(p.on!)}`
      : p.status === "scheduled"
        ? `Session ${shortDateText(p.on!)}` +
          (p.courseId === "tr-fire" ? ` at ${FIRE_BRIEFING.time}`
            : ` at ${LEADERSHIP_SESSION.time}`)
        : dueTextOf(p.due!);
    return { id: `trn-${pad(i + 1)}`, courseId: course.id,
      courseName: course.name, employeeId: p.e.id, name: p.e.fullName,
      status: p.status,
      completedOn: p.status === "done" ? shortDateOf(p.on!) : null,
      dueOn: p.due === null ? null : shortDateOf(p.due),
      sessionOn: p.status === "scheduled" ? shortDateOf(p.on!) : null,
      nextDueOn: next === null ? null : shortDateOf(next),
      display: { status: p.status === "done" ? "Completed"
        : p.status === "scheduled" ? "Booked" : "To do", when } };
  }).filter((r) => (f.employeeId === undefined ||
    r.employeeId === f.employeeId) && (f.courseId === undefined ||
    r.courseId === f.courseId));
}

export interface TrainingCourseView extends TrainingCourse {
  done: number; scheduled: number; toDo: number; overdue: number;
  display: { progress: string };
}

export function trainingCourseViews(c: DemoCompany): TrainingCourseView[] {
  const recs = trainingRecords(c);
  return TRAINING_COURSES.map((t) => {
    const mine = recs.filter((r) => r.courseId === t.id);
    const n = (s: TrainingStatus) => mine.filter((r) =>
      r.status === s).length;
    const overdue = mine.filter((r) => r.status === "to-do" &&
      r.dueOn !== null && r.dueOn.iso < AS_OF).length;
    return { ...t, done: n("done"), scheduled: n("scheduled"),
      toDo: n("to-do"), overdue, display: { progress:
        `${n("done")} completed, ${n("scheduled")} booked, ` +
        `${n("to-do")} to do` } };
  });
}

/* ---------------------------------------------------------------- *
 * P65 Engagement surveys
 * ---------------------------------------------------------------- */

/** Groups with fewer answers than this are never shown separately. */
export const SURVEY_MIN_GROUP = 5;
const CLOSED_ON = "2026-09-30";
const OPEN_ON = "2026-09-15";

export interface SurveyTheme { id: string; question: string;
  favourablePct: number }

export interface SurveyGroup { departmentId: string;
  departmentText: string; shown: boolean; invited: number;
  answered: number | null; display: { answers: string } }

export interface SurveyView {
  id: string;
  name: string;
  status: "closed" | "scheduled";
  opensOn: DisplayDate;
  closesOn: DisplayDate;
  invited: number;
  answered: number | null;
  responsePct: number | null;
  themes: SurveyTheme[];
  groups: SurveyGroup[];
  display: { response: string; privacy: string };
}

const PRIVACY = `Answers are anonymous. A group with fewer than ` +
  `${SURVEY_MIN_GROUP} answers is not shown on its own.`;

/** Who answered the September survey: three in four, by number. */
const answered = (e: DemoEmployee): boolean => numberOf(e) % 4 !== 0;

/** Sample favourable-answer shares; engagement is the goal's figure. */
function themes(c: DemoCompany): SurveyTheme[] {
  const engagement = goalViews(c, { kind: "department" }).find((g) =>
    g.id === "goal-exec-3")!.current;
  return [{ id: "th-engagement", question: "Staff engagement score",
    favourablePct: engagement },
  { id: "th-goals", question: "I understand my goals",
    favourablePct: 82 },
  { id: "th-manager", question: "I trust my manager",
    favourablePct: 85 },
  { id: "th-workload", question: "My workload is fair",
    favourablePct: 69 }];
}

export function surveyViews(c: DemoCompany): SurveyView[] {
  const invited = c.employees.filter((e) => employedIn(e, 2026, 9) &&
    e.joiningDate <= OPEN_ON);
  const got = invited.filter(answered);
  const groups = c.departments.map((d): SurveyGroup => {
    const inv = invited.filter((e) => e.departmentId === d.id);
    const ans = inv.filter(answered).length;
    const shown = ans >= SURVEY_MIN_GROUP;
    return { departmentId: d.id, departmentText: departmentText(d.id), shown,
      invited: inv.length, answered: shown ? ans : null,
      display: { answers: shown ? `${ans} of ${inv.length} answered`
        : "Too few answers to show" } };
  });
  const pct = Math.round(got.length * 100 / invited.length);
  const next = active(c).length;
  return [{ id: "sv-2026-09", name: "September pulse survey",
    status: "closed", opensOn: shortDateOf(OPEN_ON),
    closesOn: shortDateOf(CLOSED_ON), invited: invited.length,
    answered: got.length, responsePct: pct, themes: themes(c), groups,
    display: { response: `${got.length} of ${invited.length} answered ` +
      `(${pct}%)`, privacy: PRIVACY } },
  { id: "sv-2026-12", name: "December pulse survey",
    status: "scheduled", opensOn: shortDateOf("2026-11-30"),
    closesOn: shortDateOf("2026-12-11"), invited: next, answered: null,
    responsePct: null, themes: [], groups: [],
    display: { response: `Opens 30 Nov 2026, ` +
      `${plural(next, "person", "people")} invited`,
    privacy: PRIVACY } }];
}
