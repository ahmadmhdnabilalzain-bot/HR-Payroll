/** Asia/Dubai is fixed UTC+4: the UAE keeps no daylight saving. */
const OFFSET_MS = 4 * 3600 * 1000;

function shifted(at: Date): string {
  return new Date(at.getTime() + OFFSET_MS).toISOString();
}

/** The civil date in Dubai, `YYYY-MM-DD`. */
export function dubaiDate(at: Date): string {
  return shifted(at).slice(0, 10);
}

/** The clock time in Dubai as `HHMMSS`. */
export function dubaiTime(at: Date): { hhmmss: string } {
  return { hhmmss: shifted(at).slice(11, 19).replace(/:/g, "") };
}
