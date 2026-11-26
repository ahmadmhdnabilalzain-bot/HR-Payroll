import { z } from "zod";
import { listOf } from "./primitives";

export const MergeFieldDef = z.object({
  key: z.string(),
  kind: z.enum(["text", "date", "money"]),
  salary: z.boolean(),
  source: z.enum(["company", "employee", "salary", "letter", "issuer",
    "input"]),
});
export type MergeFieldDef = z.infer<typeof MergeFieldDef>;
export const MergeFieldList = listOf(MergeFieldDef);

type Kind = MergeFieldDef["kind"];
type Source = MergeFieldDef["source"];

const f = (key: string, kind: Kind = "text", salary = false)
  : MergeFieldDef => {
  const head = key.split(".")[0] as Source;
  return { key, kind, salary, source: key === "issuer.title" ? "input"
    : head };
};

/** Every field a letter template may use; nothing else is merged. */
export const MERGE_FIELDS: readonly MergeFieldDef[] = Object.freeze([
  f("company.name"), f("company.nameAr"),
  f("employee.fullName"), f("employee.fullNameAr"), f("employee.number"),
  f("employee.jobTitle"), f("employee.nationality"),
  f("employee.department"), f("employee.joiningDate", "date"),
  f("employee.lastWorkingDate", "date"),
  f("salary.basic", "money", true), f("salary.monthlyTotal", "money", true),
  f("letter.date", "date"), f("letter.reference"),
  f("issuer.name"), f("issuer.title"),
  f("input.addressee"), f("input.purpose"), f("input.reason"),
  f("input.incidentDate", "date"), f("input.replyTo"),
  f("input.candidateName"), f("input.position"),
  f("input.startDate", "date"), f("input.offerMonthlyTotal", "money", true),
]);

/** Keys a caller types in (`LetterRequest.inputs`). */
export const INPUT_KEYS: readonly string[] = Object.freeze(
  MERGE_FIELDS.filter((x) => x.source === "input").map((x) => x.key));

/** A placeholder `{{ group.name }}`; anything else with `{{` is refused. */
export const PLACEHOLDER = /\{\{\s*([a-z]+\.[a-zA-Z]+)\s*\}\}/g;
