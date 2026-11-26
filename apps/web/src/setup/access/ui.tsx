import type { ReactNode } from "react";
import { personFor } from "../../demo/time-off";
import { useDemo, type Role } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n/t";
import type { Stamp } from "./state";
import { useAccess } from "./useAccess";
import s from "./access.module.css";

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

const ROLE_KEY: Record<Role, MessageKey> = { hr: "shell.roleHr",
  gm: "shell.roleGm", it: "shell.roleIt", manager: "shell.roleManager",
  employee: "shell.roleEmployee" };

/** Who is acting in the demo, for every action's stamp. */
export function useActor(): { stamp(): Stamp; name: string;
  roleLabel: string; isGm: boolean } {
  const { data, state } = useDemo();
  const { t } = useLocale();
  const access = useAccess();
  const id = personFor(data, state.role);
  const name = data.employee(id).name.en;
  const roleLabel = t(ROLE_KEY[state.role]);
  return { name, roleLabel, isGm: state.role === "gm",
    stamp: () => ({ by: name, role: roleLabel,
      on: access?.asOfText ?? "" }) };
}

export const stampText = (x: Stamp): string =>
  `${x.by}, ${x.role}, ${x.on}`;

export function Loading() {
  const { t } = useLocale();
  return <p className={s.loading} role="status">{t("reports.loading")}</p>;
}
