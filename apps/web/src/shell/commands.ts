import type { DemoData } from "../demo/data/types";
import { openIssues, pendingApprovals, personOf } from "../demo/derive";
import type { Action, DemoState, Role } from "../demo/state";
import type { T } from "../i18n/t";
import type { Lang } from "../i18n/types";
import type { IconName } from "../ui/Icon";

export type Group = "actions" | "people";

/** One palette entry: only things that work in this build. */
export interface Command {
  id: string;
  group: Group;
  label: string;
  hint: string;
  icon: IconName;
  /** Extra words that should match (both languages). */
  keywords: string;
  run(): void;
}

export interface Env {
  data: DemoData;
  state: DemoState;
  dispatch(a: Action): void;
  t: T;
  lang: Lang;
  arabicShown: boolean;
  toggleTheme(): void;
  toggleLang(): void;
}

function focusApproval(id: string): void {
  const el = document.getElementById(`approval-${id}`);
  el?.scrollIntoView({ block: "center", behavior: "smooth" });
  el?.querySelector<HTMLButtonElement>("button:last-child")
    ?.focus({ preventScroll: true });
}

function actions(e: Env): Command[] {
  const other: Role = e.state.role === "hr" ? "gm" : "hr";
  const roleName = other === "hr" ? e.t("shell.roleHr")
    : e.t("shell.roleGm");
  const list: Command[] = [
    { id: "theme", group: "actions", label: e.t("shell.actTheme"),
      hint: "", icon: "moon", keywords: "dark light theme mode",
      run: e.toggleTheme },
    { id: "amounts", group: "actions", label: e.t("shell.actHide"),
      hint: "", icon: "eyeOff", keywords: "salary mask privacy amounts",
      run: () => e.dispatch({ type: "toggle-amounts" }) },
    { id: "role", group: "actions", label: e.t("shell.actRole",
      { role: roleName }), hint: e.data.employee(personOf(e.data, other))
      .name[e.lang], icon: "user", keywords: "role switch view",
      run: () => e.dispatch({ type: "role", role: other }) },
    { id: "sources", group: "actions", label: e.t("shell.actSources"),
      hint: "", icon: "info", keywords: "source rules basis why",
      run: () => {
        e.dispatch({ type: "sources", open: true });
        document.getElementById("run-title")
          ?.scrollIntoView({ block: "start", behavior: "smooth" });
      } },
  ];
  if (e.arabicShown) {
    list.push({ id: "lang", group: "actions", label: e.t("shell.actLang"),
      hint: "", icon: "chevronEnd", keywords: "arabic english language",
      run: e.toggleLang });
  }
  return list;
}

function people(e: Env): Command[] {
  const issues = openIssues(e.data, e.state).filter((i) =>
    i.employeeId !== null);
  const fromIssues = issues.map((i): Command => {
    const who = e.data.employee(i.employeeId ?? "");
    return { id: `issue:${i.id}`, group: "people", icon: "alert",
      label: e.t("shell.actIssue", { name: who.name[e.lang] }),
      hint: i.title[e.lang],
      keywords: `${who.name.en} ${who.name.ar} ${i.title.en} ` +
        i.reason.en,
      run: () => e.dispatch({ type: "focus-issue", id: i.id }) };
  });
  const fromApprovals = pendingApprovals(e.data, e.state).map((a)
    : Command => {
    const who = e.data.employee(a.employeeId ?? a.makerId);
    return { id: `approval:${a.id}`, group: "people", icon: "check",
      label: e.t("shell.actApproval", { title: a.title[e.lang] }),
      hint: who.name[e.lang],
      keywords: `${who.name.en} ${who.name.ar} ${a.title.en} approve`,
      run: () => focusApproval(a.id) };
  });
  return [...fromIssues, ...fromApprovals];
}

export function commands(e: Env): Command[] {
  return [...actions(e), ...people(e)];
}

/** Every word of the query must appear in the label, hint or keywords. */
export function matches(c: Command, query: string): boolean {
  const hay = `${c.label} ${c.hint} ${c.keywords}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean)
    .every((w) => hay.includes(w));
}
