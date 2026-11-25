export interface Finding {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly line: number;
  readonly field: number | null;
  readonly message: string;
  readonly value: string;
}
