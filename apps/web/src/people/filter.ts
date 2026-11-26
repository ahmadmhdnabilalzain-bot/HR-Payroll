import type { Person } from "../demo/data/people-types";

/** Case and accent blind, so "jose" finds "José" too. */
const fold = (x: string): string =>
  x.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Every word of the query must appear in the name (either language),
 * the role, the department, the branch or the staff number. `dept`
 * null means all departments. The order stays the list's (by name).
 */
export function filterPeople(list: Person[], query: string,
  dept: string | null): Person[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return list.filter((p) => {
    if (dept !== null && p.departmentId !== dept) return false;
    const hay = fold([p.name.en, p.name.ar, p.role.en, p.role.ar,
      p.department.en, p.department.ar, p.branch.en, p.number].join(" "));
    return words.every((w) => hay.includes(w));
  });
}

/** A branch name without its city or any bracketed tag, for rows. */
export const shortBranch = (name: string): string =>
  name.replace(/\s*\([^)]*\)\s*$/u, "").split(/[,،]/u)[0] ?? name;
