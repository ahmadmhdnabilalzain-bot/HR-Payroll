import { DEMO_LABELS_AR } from "./labels-ar";
import { DEMO_LABELS_EN, type DemoLabelKey } from "./labels-en";

export type DemoLang = "en" | "ar";

export const DEMO_LABELS: Record<DemoLang, Record<DemoLabelKey, string>> =
  { en: DEMO_LABELS_EN, ar: DEMO_LABELS_AR };

/** Arabic demo labels are not reviewed by a native speaker yet. */
export const DEMO_AR_REVIEWED = false;

export function demoLabel(key: DemoLabelKey, lang: DemoLang): string {
  return DEMO_LABELS[lang][key];
}

export function isDemoLabelKey(key: string): key is DemoLabelKey {
  return Object.hasOwn(DEMO_LABELS_EN, key);
}
