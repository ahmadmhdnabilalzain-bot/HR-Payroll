import type { Lang } from "./i18n/types";

/**
 * The product name, chosen by the owner (2026-11-26). Running copy and
 * page titles use it; the logo is the outlined wordmark in
 * shell/Wordmark.tsx (docs/brand/logo/final). This is the
 * only file that may contain it (tests/unit/brand.test.ts). The Latin
 * wordmark is kept in the Arabic interface too (owner's instruction).
 * No trademark symbols are used anywhere.
 */
export const PRODUCT_NAME: Readonly<Record<Lang, string>> = Object.freeze({
  en: "Mubinflow",
  ar: "Mubinflow",
});

export function documentTitle(lang: Lang): string {
  return PRODUCT_NAME[lang];
}
