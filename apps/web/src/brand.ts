import type { Lang } from "./i18n/types";

/**
 * The product name, chosen by the owner on 2026-11-27. This is the
 * only file that may contain it (tests/unit/brand.test.ts). The Latin
 * wordmark is kept in the Arabic interface too (owner's instruction).
 * No trademark symbols are used anywhere.
 */
export const PRODUCT_NAME: Readonly<Record<Lang, string>> = Object.freeze({
  en: "Mubinflow",
  ar: "Mubinflow",
});

/**
 * The wordmark's two halves: "Mubin" (Arabic for clear) set in the
 * regular weight, "flow" lighter. Joined they are the product name.
 */
export const WORDMARK = Object.freeze({ strong: "Mubin", light: "flow" });

/** The favicon monogram's letter. */
export const MONOGRAM = "M";

export function documentTitle(lang: Lang): string {
  return PRODUCT_NAME[lang];
}
