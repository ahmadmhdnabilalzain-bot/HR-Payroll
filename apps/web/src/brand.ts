import type { Lang } from "./i18n/types";

/**
 * The product name: placeholder until the owner names the product.
 * This is the only file that may contain it (tests/unit/brand.test.ts).
 * The Arabic name NEEDS NATIVE REVIEW: authored by Claude.
 */
export const PRODUCT_NAME: Readonly<Record<Lang, string>> = Object.freeze({
  en: "HR and Payroll",
  ar: "الموارد البشرية والرواتب",
});

export function documentTitle(lang: Lang): string {
  return PRODUCT_NAME[lang];
}
