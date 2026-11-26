/**
 * Arabic is hidden while its text is unreviewed (the data package
 * says so with `arReviewed`; the app's own Arabic is NEEDS NATIVE
 * REVIEW too). `?ar=1` in the address shows it anyway, for review and
 * screenshots; `?ar=0` always hides it.
 */
export function showArabic(arReviewed: boolean, search: string): boolean {
  const v = new URLSearchParams(search).get("ar");
  if (v === "1") return true;
  if (v === "0") return false;
  return arReviewed;
}
