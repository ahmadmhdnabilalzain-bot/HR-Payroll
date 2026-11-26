import type {
  SkillItem,
  SkillRow,
  SkillSummary,
  SurveyView,
  TrainingCourseView,
  TrainingRecord,
} from "@payroll/demo-data";

/**
 * Talent (WP13): skills, training and engagement surveys, as the
 * screens read them. Built in talent.ts, which only adapter.ts imports.
 * The shapes are the package's own, re-exported so screens never
 * import the package.
 */
export type {
  SkillItem,
  SkillRow,
  SkillSummary,
  SurveyView,
  TrainingCourseView,
  TrainingRecord,
};

export interface TalentData {
  skills(): readonly SkillItem[];
  skillMatrix(): SkillRow[];
  skillSummary(): SkillSummary[];
  /** The line that says the levels are samples. */
  skillBasis: string;
  courses(): TrainingCourseView[];
  records(f?: { employeeId?: string; courseId?: string }): TrainingRecord[];
  surveys(): SurveyView[];
  /** Groups with fewer answers than this are not shown on their own. */
  minGroup: number;
  /** The demo day, ISO, only for comparing with due dates. */
  asOf: string;
}
