import { SAFETY_BLURBS } from "../people/safety/Report";
import { COST_BLURBS } from "./cost";
import { MORE_BLURBS } from "./more";
import { PLANNING_BLURBS } from "./planning";
import { ANALYSIS_BLURBS } from "./analysis";

/** What each report answers, by area id: the home page's one line. */
export const BLURB: Readonly<Record<string, string>> = {
  ...COST_BLURBS,
  ...PLANNING_BLURBS,
  ...SAFETY_BLURBS,
  ...MORE_BLURBS,
  ...ANALYSIS_BLURBS,
  "reports.summary": "What is this month's pay, and how does it compare " +
    "with last month?",
  "reports.departments": "Which department costs the most?",
  "reports.files": "Which salary files have been made, and for how much?",
  "reports.trend": "How has pay moved from January to October?",
  "reports.variance": "Why did gross pay change, and who or what caused " +
    "it?",
  "reports.overtime": "What does overtime cost each month, and who " +
    "earned it?",
  "reports.nationality": "How many people of each nationality work here?",
  "reports.documents": "Whose visa, Emirates ID or passport expires " +
    "next?",
  "reports.headcount": "Who joined and who left, and how fast do " +
    "people leave?",
  "reports.leave": "Who has taken or is waiting on leave, and how much " +
    "is left?",
  "reports.dashboard-hr": "What does HR need to look at today?",
  "reports.dashboard-exec": "How is this pay run, in a few numbers?",
  "reports.audit": "Who did what, and has the record been changed " +
    "since?",
};
