/**
 * Pure: who sent this? An exact, lower-cased match on an active
 * employee's email gives that employee; otherwise an exact allow-list
 * address or an `@domain` entry for exactly the address's domain is
 * allowed without an employee. No other match (no subdomains, no
 * display names, no partial addresses).
 */
export function matchSender(from: string,
  employees: { id: string; email: string | null }[], allowlist: string[])
  : { allowed: boolean; employeeId: string | null } {
  const addr = from.trim().toLowerCase();
  const at = addr.lastIndexOf("@");
  if (at < 1 || at === addr.length - 1) {
    return { allowed: false, employeeId: null };
  }
  const emp = employees.find((e) => e.email !== null &&
    e.email.toLowerCase() === addr);
  if (emp !== undefined) return { allowed: true, employeeId: emp.id };
  const domain = addr.slice(at);
  const ok = allowlist.some((x) => x === addr || x === domain);
  return { allowed: ok, employeeId: null };
}

/** The domain part of an address, lower case ("" when none). */
export const domainOf = (addr: string) => {
  const at = addr.lastIndexOf("@");
  return at < 0 ? "" : addr.slice(at + 1).trim().toLowerCase();
};
