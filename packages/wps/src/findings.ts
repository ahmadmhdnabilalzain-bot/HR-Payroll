export interface Finding {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly line: number;
  readonly field: number | null;
  readonly message: string;
  readonly value: string;
}

export function makeFinding(
  code: string,
  severity: Finding["severity"],
  at: { readonly line: number; readonly field: number | null },
  message: string,
  value: string,
): Finding {
  return { code, severity, line: at.line, field: at.field, message, value };
}

/** Stable order: line, then field (line-level first), then code. */
export function sortFindings(fs: readonly Finding[]): Finding[] {
  return [...fs].sort(
    (a, b) =>
      a.line - b.line ||
      (a.field ?? 0) - (b.field ?? 0) ||
      (a.code < b.code ? -1 : a.code > b.code ? 1 : 0),
  );
}
