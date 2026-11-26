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
  sampleData: "Sample data",
  sampleDataHint: "Demo data in this browser only. Reloading the page " +
    "starts again from the sample, so changes are not kept.",
  arReviewBanner: "Arabic text awaiting native review",
  building: "This app is being built. The screens come next.",
  loading: "Loading",
  tryAgain: "Try again",
  reference: "Reference: {requestId}",
  employees: { one: "{count} employee", other: "{count} employees" },
  days: { one: "{count} day", other: "{count} days" },
} satisfies EnNamespace;
