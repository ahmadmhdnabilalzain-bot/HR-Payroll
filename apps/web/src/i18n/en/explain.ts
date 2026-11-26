import type { EnNamespace } from "../types";

/** The explain-why panel (src/components/explain). */
export const explain = {
  title: "How this was worked out",
  open: "Explain {label}",
  close: "Close",
  rules: "Rules behind it",
  noRules: "A sum of the lines above; no rule of its own.",
  statusOfficial: "Official source",
  statusSecondary: "Secondary source",
  statusConvention: "Engine convention, not law",
  statusHypothetical: "Assumption, to confirm",
  statusUnsourced: "No source yet, to confirm",
  noSource: "No written source.",
  notComputed: "Not computed",
} satisfies EnNamespace;
