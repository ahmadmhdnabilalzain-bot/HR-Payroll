import type { ReactNode } from "react";
import { useDemo } from "../../demo/state";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { actorOf } from "../rules/actor";
import { usePrivacy } from "./load";
import { privacyValue, type PrivacyStamp } from "./state";
import s from "./privacy.module.css";

export type Tone = "ok" | "warn" | "danger" | "none";

/** Status is a word and an 8 px dot, never colour alone. */
export function Status(p: { tone: Tone; children: ReactNode }) {
  return (
    <span className={s.status}>
      <span className={s.dot} data-tone={p.tone} aria-hidden="true" />
      <span>{p.children}</span>
    </span>
  );
}

/** The source, the current choices and who is acting. */
export function usePrivacyView() {
  const src = usePrivacy();
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const actor = actorOf(data, state);
  const months: Record<string, number> = {};
  for (const c of src.categories) {
    months[c.id] = privacyValue(state.privacyEdits, `months:${c.id}`) ??
      c.sampleMonths;
  }
  const days = privacyValue(state.privacyEdits, "days") ?? src.defaultDays;
  const canEdit = state.role === "hr" || state.role === "gm";
  const stamp = (): PrivacyStamp => ({ who: actor.who, role: actor.role,
    on: actor.on });
  const stampText = (x: PrivacyStamp): string =>
    `${x.who}, ${x.role}, ${formatDate(x.on, lang)}`;
  return { src, state, dispatch, lang, months, days, canEdit, stamp,
    stampText };
}

export type PrivacyView = ReturnType<typeof usePrivacyView>;

export const monthsText = (n: number): string => n === 0 ? "At leaving"
  : `${n} ${n === 1 ? "month" : "months"} after leaving`;

export const READ_ONLY = " You can read this; HR and the General " +
  "manager change it.";
