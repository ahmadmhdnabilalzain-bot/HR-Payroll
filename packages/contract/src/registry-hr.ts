import type { z } from "zod";
import * as tasks from "./tasks";

/** Plan 8's named schemas (OpenAPI components and EXAMPLES keys). */
export const HR_SCHEMAS: Readonly<Record<string, z.ZodType>> = {
  ...pick(tasks, ["ChecklistItem", "TaskComment", "TaskSummary", "Task",
    "TaskCreate", "TaskUpdate", "CommentCreate", "ChecklistItemUpdate",
    "TaskSummaryList"]),
};

function pick(
  mod: Record<string, unknown>,
  names: readonly string[],
): Record<string, z.ZodType> {
  const out: Record<string, z.ZodType> = {};
  for (const n of names) {
    const s = mod[n];
    if (s === undefined) throw new Error(`no schema ${n}`);
    out[n] = s as z.ZodType;
  }
  return out;
}
