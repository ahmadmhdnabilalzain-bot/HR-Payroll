/**
 * Canonical JSON: object keys sorted, bigint (fils) as a decimal
 * string. Two builds with the same seed serialize to the same bytes.
 */
function canonical(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort()
      .map((k) => [k, canonical(o[k])]));
  }
  return value;
}

export function serializeDemo(value: unknown, indent = 0): string {
  return JSON.stringify(canonical(value), null, indent);
}
