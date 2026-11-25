import { z } from "zod";

/** I/O shell: schema for the demo's settlement sample file. */
export const SampleSchema = z.object({
  joiningDate: z.string(),
  lastWorkingDate: z.string(),
  unpaidLeaveDays: z.number().int(),
  basicMonthlyAed: z.string(),
  workerClass: z.enum(["expat-full-time", "uae-national", "gcc-national"]),
  unusedLeaveDays: z.number().int(),
}).strict();

export type Sample = z.infer<typeof SampleSchema>;
