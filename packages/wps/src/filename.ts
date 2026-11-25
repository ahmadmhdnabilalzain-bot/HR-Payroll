import { EngineError, parseIsoDate } from "@payroll/engine";
import { padId } from "./format";
import type { SifLayout } from "./layout";

/** HHMMSS, a real clock time. */
export function checkTime(time: string): void {
  const m = /^(\d{2})(\d{2})(\d{2})$/.exec(time);
  const ok =
    m !== null && Number(m[1]) < 24 && Number(m[2]) < 60 && Number(m[3]) < 60;
  if (!ok) {
    throw new EngineError("INVALID_TIME", "Time must be HHMMSS", {
      value: time,
    });
  }
}

/** Employer id, then YYMMDD, then HHMMSS, extension .SIF. */
export function sifFileName(
  employerId: string,
  createdDate: string,
  createdTime: string,
  layout: SifLayout,
): string {
  const { y, m, d } = parseIsoDate(createdDate, "createdDate");
  checkTime(createdTime);
  const p = (n: number): string => String(n % 100).padStart(2, "0");
  const id = padId(employerId, layout.employerIdLength);
  return `${id}${p(y)}${p(m)}${p(d)}${createdTime}.SIF`;
}
