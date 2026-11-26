export const DUBAI = "Asia/Dubai";

/** The civil date in Dubai of an instant, as `YYYY-MM-DD`. */
export function todayInDubai(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DUBAI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string): string =>
    parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
