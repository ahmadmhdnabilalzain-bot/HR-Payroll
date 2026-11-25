import {
  EngineError,
  daysBetween,
  fils,
  parseIsoDate,
  type Fils,
} from "@payroll/engine";
import { checkTime, sifFileName } from "./filename";
import { formatMonth } from "./format";
import type { SifLayout } from "./layout";
import { defaultLayout } from "./layout";
import {
  edrLine,
  evpLine,
  scrLine,
  type EdrInput,
  type EvpInput,
} from "./records";

export interface SifEmployee {
  readonly edr: EdrInput;
  readonly evp?: EvpInput;
}

export interface SifBatch {
  readonly employerId: string;
  readonly bankRoutingCode: string;
  readonly createdDate: string;
  /** HHMMSS. The SCR carries its first four digits. */
  readonly createdTime: string;
  readonly month: { readonly year: number; readonly month: number };
  readonly reference?: string;
  readonly employees: readonly SifEmployee[];
}

export interface SifResult {
  readonly fileName: string;
  readonly text: string;
  readonly lines: string[];
  readonly total: Fils;
}

const fail = (code: string, msg: string, value: string): EngineError =>
  new EngineError(code, msg, { value });

const strip = (id: string): string => id.replace(/^0+/, "");

function checkPeriod(e: EdrInput, b: SifBatch, l: SifLayout): void {
  const s = parseIsoDate(e.payStart, "payStart");
  const t = parseIsoDate(e.payEnd, "payEnd");
  if (e.payStart < l.minPayStart) {
    throw fail("PAY_START_TOO_EARLY", "Pay start is too early", e.payStart);
  }
  for (const d of [s, t]) {
    if (d.y !== b.month.year || d.m !== b.month.month) {
      throw fail("PAY_PERIOD_MONTH_MISMATCH", "Pay date is outside the month",
        `${e.payStart}..${e.payEnd}`);
    }
  }
  if (daysBetween(e.payStart, e.payEnd) + 1 !== e.days) {
    throw fail("DAYS_MISMATCH", "Days is not end minus start plus 1",
      String(e.days));
  }
}

function checkEvp(emp: SifEmployee): void {
  const { edr, evp } = emp;
  if (evp === undefined) return;
  if (edr.variable === 0n) {
    throw fail("EVP_WITHOUT_VARIABLE", "EVP given but variable is zero",
      edr.personId);
  }
  const same = strip(evp.personId) === strip(edr.personId);
  if (!same || evp.routingCode !== edr.routingCode) {
    throw fail("EVP_MISMATCH", "EVP does not match its EDR", evp.personId);
  }
}

function checkBatch(b: SifBatch, l: SifLayout): void {
  if (b.employees.length === 0) {
    throw fail("EMPTY_BATCH", "Batch has no employees", "0");
  }
  checkTime(b.createdTime);
  const seen = new Set<string>();
  for (const emp of b.employees) {
    const key = strip(emp.edr.personId);
    if (seen.has(key)) {
      throw fail("DUPLICATE_EMPLOYEE", "Two EDRs for one person",
        emp.edr.personId);
    }
    seen.add(key);
    checkPeriod(emp.edr, b, l);
    checkEvp(emp);
  }
}

function scrFor(b: SifBatch, total: Fils, l: SifLayout): string {
  const ref = b.reference === undefined ? {} : { reference: b.reference };
  return scrLine(
    {
      employerId: b.employerId,
      bankRoutingCode: b.bankRoutingCode,
      createdDate: b.createdDate,
      createdTime: b.createdTime.slice(0, 4),
      month: formatMonth(b.month.year, b.month.month),
      edrCount: b.employees.length,
      total,
      ...ref,
    },
    l,
  );
}

export function generateSif(
  batch: SifBatch,
  layout: SifLayout = defaultLayout,
): SifResult {
  checkBatch(batch, layout);
  const lines: string[] = [];
  let sum = 0n;
  for (const { edr, evp } of batch.employees) {
    lines.push(edrLine(edr, layout));
    if (evp !== undefined) {
      lines.push(evpLine(evp, layout));
    }
    sum += edr.fixed + edr.variable;
  }
  const total = fils(sum);
  lines.push(scrFor(batch, total, layout));
  const { employerId: eid, createdDate: cd, createdTime: ct } = batch;
  const fileName = sifFileName(eid, cd, ct, layout);
  const text = lines.join(layout.lineEnding) + layout.lineEnding;
  return { fileName, text, lines, total };
}
