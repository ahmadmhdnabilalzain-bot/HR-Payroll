/**
 * Freezes an object and everything reachable from it, so shared engine
 * data (sources, rule packs, message catalogs) cannot be changed by a
 * caller. Returns its argument.
 */
export function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null) return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key]);
  }
  return value;
}
