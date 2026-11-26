import { STATUS_WORD, type RuleStatus } from "./data";
import s from "./rules.module.css";

const TONE: Record<RuleStatus, string> = { official: "law",
  secondary: "second", convention: "ours", hypothetical: "plain",
  unsourced: "check" };

/** The source status as a word with a dot (never colour alone). */
export function StatusWord(p: { status: RuleStatus }) {
  return (
    <span className={s.status} data-tone={TONE[p.status]}>
      {STATUS_WORD[p.status]}
    </span>
  );
}
