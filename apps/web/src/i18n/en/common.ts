import type { EnNamespace } from "../types";

export const common = {
  language: "Language",
  english: "English",
  // Arabic's own name for itself. NEEDS NATIVE REVIEW.
  arabic: "العربية",
  theme: "Theme",
  themeLight: "Light",
  themeDark: "Dark",
  themeSystem: "System",
  sampleData: "Demo: fictional data",
  sampleDataHint: "Every person, number and amount here is invented. " +
    "Nothing is saved; reloading starts again.",
  arReviewBanner: "Arabic text awaiting native review",
  loading: "Loading",
  tryAgain: "Try again",
  reference: "Reference: {requestId}",
  employees: { one: "{count} employee", other: "{count} employees" },
  days: { one: "{count} day", other: "{count} days" },
} satisfies EnNamespace;
