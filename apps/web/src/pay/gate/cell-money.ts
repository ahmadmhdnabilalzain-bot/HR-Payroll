import type { Fils } from "@payroll/engine";
import { useMoney } from "../../reports/fmt";

const nb = (t: string): string => t.replace(/ /g, " ");

/** Money for table cells: the reports' formatter, never split in two. */
export function useCellMoney(): { m(f: Fils): string;
  signed(f: Fils): string } {
  const x = useMoney();
  return { m: (f) => nb(x.m(f)), signed: (f) => nb(x.signed(f)) };
}
