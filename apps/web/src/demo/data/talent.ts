import {
  AS_OF,
  SKILLS,
  SKILL_BASIS,
  SURVEY_MIN_GROUP,
  skillMatrix,
  skillSummary,
  surveyViews,
  trainingCourseViews,
  trainingRecords,
  type DemoCompany,
} from "@payroll/demo-data";
import type { TalentData } from "./talent-types";

/** The Talent view over the demo company. Imported only by adapter.ts. */
export function adaptTalent(c: DemoCompany): TalentData {
  return {
    skills: () => SKILLS,
    skillMatrix: () => skillMatrix(c),
    skillSummary: () => skillSummary(c),
    skillBasis: SKILL_BASIS,
    courses: () => trainingCourseViews(c),
    records: (f) => trainingRecords(c, f),
    surveys: () => surveyViews(c),
    minGroup: SURVEY_MIN_GROUP,
    asOf: AS_OF,
  };
}
