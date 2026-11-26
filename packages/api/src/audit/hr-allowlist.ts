/**
 * Plan 8's audit `data` keys, each with a shape check, joined to Plan
 * 3's allowlist. No key carries free text, an amount or contact data.
 */
type Check = (v: unknown) => boolean;

const WORD = /^[a-z][a-z-]{0,39}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const word: Check = (v) => typeof v === "string" && WORD.test(v);
const words: Check = (v) => Array.isArray(v) && v.length <= 10 &&
  v.every(word);
const uuid: Check = (v) => typeof v === "string" && UUID_RE.test(v);
const int: Check = (v) => Number.isSafeInteger(v);

export const HR_CHECKS: Readonly<Record<string, Check>> = {
  source: word,
  flowType: word,
  kind: word,
  kinds: words,
  statuses: words,
  inApp: word,
  external: word,
  applicationId: uuid,
  taskCount: int,
  progress: int,
  lastWorkingDate: (v) => typeof v === "string" && DATE.test(v),
};
