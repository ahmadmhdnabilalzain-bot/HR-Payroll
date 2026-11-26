import { toWireSifFile } from "../contract";
import { param, signedIn, type Ctx, type Handler } from "./context";
import { dubaiClock, dubaiDate } from "./dates";
import { MockFail, notFound } from "./fail";
import { findRun } from "./handlers-payroll";
import type { MockSif } from "./seed-types";
import { buildSif } from "./sif";
import { newId, record } from "./state";

/** A second call for the same run returns the stored file (Plan 3). */
function createSif(c: Ctx, runId: string): MockSif {
  const run = findRun(c, runId);
  if (run.status !== "approved") {
    throw new MockFail("RUN_NOT_APPROVED", "approve the run first");
  }
  const stored = c.s.sifs.find((x) => x.file.payRunId === run.id);
  if (stored !== undefined) return stored;
  const sif = buildSif({ id: newId(c.s, "sif"), payRunId: run.id,
    company: c.s.company,
    slips: c.s.payslips.filter((p) => p.payRunId === run.id),
    employees: c.s.employees, createdDate: dubaiDate(c.now),
    createdTime: dubaiClock(c.now), createdAt: c.now, today: c.today });
  c.s.sifs = [...c.s.sifs, sif];
  const { fileName, errorCount, warningCount } = sif.file;
  record(c.s, signedIn(c), { at: c.now, action: "sif.generated",
    entityType: "sif-file", entityId: sif.file.id,
    data: { fileName, errorCount, warningCount } });
  return sif;
}

function findSif(c: Ctx, id: string): MockSif {
  const sif = c.s.sifs.find((x) => x.file.id === id);
  if (sif === undefined) throw notFound("salary file");
  return sif;
}

function download(c: Ctx, id: string): string {
  const sif = findSif(c, id);
  record(c.s, signedIn(c), { at: c.now, action: "sif.downloaded",
    entityType: "sif-file", entityId: id, data: {} });
  return sif.text;
}

export const SIF_HANDLERS = {
  createSif: (c, r) => toWireSifFile(createSif(c, param(r)).file),
  getSifFile: (c, r) => toWireSifFile(findSif(c, param(r)).file),
  downloadSif: (c, r) => download(c, param(r)),
} satisfies Record<string, Handler>;
