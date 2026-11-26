import { use } from "react";
import { loadTimeSource } from "../demo/data/time-load";
import type { TimeData } from "../demo/data/time-types";
import { useDemo, type Role } from "../demo/state";
import { personFor, visibleIds } from "../demo/time-off";
import { useLocale } from "../i18n/LocaleProvider";
import type { Lang } from "../i18n/types";
import type { Tone } from "../people/words";
import p from "../people/page.module.css";

/** The Time data, loaded once as its own chunk (suspends on first use). */
export function useTimeData(): TimeData {
  return use(loadTimeSource()).data;
}

export interface Who {
  lang: Lang;
  role: Role;
  /** The person the current role stands for. */
  me: string;
  /** Everyone this role may see in Time (all, or the team). */
  visible: Set<string>;
  name(id: string): string;
  jobOf(id: string): string;
  /** Who decides something about this person. */
  approverOf(id: string): string;
  /** HR may decide anything for pay; others decide for their team. */
  canDecide(forPerson: string): boolean;
}

export function useWho(): Who {
  const { lang } = useLocale();
  const { data, state } = useDemo();
  const me = personFor(data, state.role);
  const find = (id: string) => data.people.person(id);
  return { lang, role: state.role, me,
    visible: new Set(visibleIds(data, state)),
    name: (id) => find(id)?.name[lang] ?? id,
    jobOf: (id) => find(id)?.role[lang] ?? "",
    approverOf: (id) => data.people.approverOf(id),
    canDecide: (id) => id !== me && (state.role === "hr" ||
      data.people.approverOf(id) === me) };
}

/** A status: a word and a dot, never a pill (people/page.module.css). */
export function Status(q: { tone: Tone; children: string }) {
  return <span className={p.status} data-tone={q.tone}>{q.children}</span>;
}
