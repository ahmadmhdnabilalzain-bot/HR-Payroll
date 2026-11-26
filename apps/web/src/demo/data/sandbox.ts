import {
  buildDemoCompany,
  draftDetail,
  draftProblem,
  draftTitle,
  newDraft,
  sandboxOptions,
  sandboxRun,
  SANDBOX_NOT_SAVED,
  EMPLOYER_NOTE,
  type SandboxDraft,
  type SandboxKind,
  type SandboxLine,
  type SandboxOptions,
  type SandboxResult,
  type SandboxRow,
} from "@payroll/demo-data";

export type { SandboxDraft, SandboxKind, SandboxLine, SandboxOptions,
  SandboxResult, SandboxRow };
export { draftDetail, draftProblem, draftTitle, EMPLOYER_NOTE, newDraft,
  SANDBOX_NOT_SAVED };

/**
 * The pay-structure sandbox's data (R41): the package's selectors, in
 * a lazy chunk (every run works the October payslips out again).
 * Reads the base company, so nothing here moves a real figure.
 */
export interface SandboxSource {
  options: SandboxOptions;
  run(d: SandboxDraft): SandboxResult;
}

export function buildSandboxSource(): SandboxSource {
  const c = buildDemoCompany();
  return { options: sandboxOptions(c), run: (d) => sandboxRun(c, d) };
}
