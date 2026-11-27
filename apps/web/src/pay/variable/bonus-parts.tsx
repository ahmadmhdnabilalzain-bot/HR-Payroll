import type { StatusTone } from "../../ui/templates";
import { bonusStatus, type BonusRun, type BonusStatus }
  from "../../demo/bonus-state";
import { StatusPill } from "../../ui/templates";

/** Status as the screens word it: signed off, never approved. */
export const BONUS_WORD: Record<BonusStatus, string> = {
  draft: "Draft", waiting: "Waiting for sign-off", signed: "Signed off",
  declined: "Declined",
};

export const BONUS_TONE: Record<BonusStatus, StatusTone> = {
  draft: "neutral", waiting: "warn", signed: "done", declined: "neutral",
};

export function BonusState(p: { run: BonusRun }) {
  const st = bonusStatus(p.run);
  return <StatusPill tone={BONUS_TONE[st]}>{BONUS_WORD[st]}</StatusPill>;
}

export const BONUS_LIST = "bonus";
