// NEEDS NATIVE REVIEW: generated Arabic names, authored by Claude.
import { employeeFrom } from "./seed-employee";
import type { PersonSpec } from "./seed-people";
import type { MockEmployee } from "./seed-types";

const FIRST = [["Rana", "رنا"], ["Karim", "كريم"], ["Meera", "ميرا"],
  ["Yousef", "يوسف"], ["Grace", "غريس"], ["Tariq", "طارق"]];
const LAST = [["Mansour", "منصور"], ["Pillai", "بيلاي"], ["Reyes", "رييس"],
  ["Farouk", "فاروق"], ["Odhiambo", "أوديامبو"]];

/** Exactly 60 characters: long names must not break layouts. */
export const LONG_NAME =
  "Muhammad Abdulrahman Al-Khateeb bin Saeed Al-Mansoori Junior";

/** AED 9,999,999.99: the largest salary the wire format allows here. */
export const TOP_BASIC = 999999999n;

function spec(i: number): PersonSpec {
  const [f, fa] = FIRST[i % FIRST.length] ?? ["", ""];
  const [l, la] = LAST[i % LAST.length] ?? ["", ""];
  const first = i === 0;
  return {
    name: first ? LONG_NAME : `${f} ${l} ${i}`,
    nameAr: `${fa} ${la} ${i}`,
    dept: i % 3, job: "Associate", nationality: "IN",
    workerClass: "expat-full-time",
    basic: i === 1 ? TOP_BASIC : BigInt(4000 + (i % 7) * 500) * 100n,
    housing: 150000n, transport: i % 2 === 0 ? 50000n : 0n,
  };
}

/** Extra staff for `?mock-seed=large`, numbered after the demo twelve. */
export function largeEmployees(count: number): MockEmployee[] {
  return Array.from({ length: count }, (_, i) =>
    employeeFrom(spec(i), 13 + i, `20${10 + (i % 14)}-03-01`, true));
}
