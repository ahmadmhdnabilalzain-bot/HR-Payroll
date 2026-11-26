import type { DemoData } from "../demo/data/types";
import { openIssues, pendingApprovals, personOf } from "../demo/derive";
import { navigate } from "../demo/route";
import type { Action, DemoState, Role, Section } from "../demo/state";
import { visibleIds } from "../demo/time-off";
import type { MessageKey } from "../i18n/t";
import type { T } from "../i18n/t";
import type { Lang } from "../i18n/types";
import type { IconName } from "../ui/Icon";

export type Group = "go" | "actions" | "people";

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
  switchRole(role: Role): void;
  /** Sections that have a view: [id, label, icon]. */
  sections: [Section, string, IconName][];
  /** True when the People view exists (profiles are searchable). */
  peopleShown: boolean;
}

function focusApproval(id: string): void {
  const el = document.getElementById(`approval-${id}`);
  el?.scrollIntoView({ block: "center", behavior: "smooth" });
  el?.querySelector<HTMLButtonElement>("button:last-child")
    ?.focus({ preventScroll: true });
}

const ROLES: Role[] = ["hr", "gm", "manager", "employee"];
const ROLE_KEY: Record<Role, MessageKey> = { hr: "shell.roleHr",
  gm: "shell.roleGm", manager: "shell.roleManager",
  employee: "shell.roleEmployee" };

/** Commands that touch Home's rows go to Home first. */
function onHome(e: Env, then: () => void): void {
  if (location.hash.replace(/^#\/?/, "").split("/")[0] === "" ||
    location.hash.startsWith("#/home")) {
    then();
    return;
  }
  navigate("home");
  setTimeout(then, 120);
}

function actions(e: Env): Command[] {
  const company = e.state.role === "hr" || e.state.role === "gm";
  const list: Command[] = e.sections.map(([id, label, icon]) => ({
    id: `go:${id}`, group: "go", label, hint: "", icon,
    keywords: `go open ${id}`, run: () => navigate(id) }));
  list.push(
    { id: "theme", group: "actions", label: e.t("shell.actTheme"),
      hint: "", icon: "moon", keywords: "dark light theme mode",
      run: e.toggleTheme },
    { id: "amounts", group: "actions", label: e.t("shell.actHide"),
      hint: "", icon: "eyeOff", keywords: "salary mask privacy amounts",
      run: () => e.dispatch({ type: "toggle-amounts" }) },
    ...ROLES.filter((r) => r !== e.state.role).map((r): Command => ({
      id: `role:${r}`, group: "actions",
      label: e.t("shell.actRole", { role: e.t(ROLE_KEY[r]) }),
      hint: e.data.employee(personOf(e.data, r)).name[e.lang],
      icon: "user", keywords: "role switch view as",
      run: () => e.switchRole(r) })));
  if (company) {
    list.push({ id: "sources", group: "actions",
      label: e.t("shell.actSources"), hint: "", icon: "info",
      keywords: "source rules basis why", run: () => onHome(e, () => {
        e.dispatch({ type: "sources", open: true });
        document.getElementById("run-title")
          ?.scrollIntoView({ block: "start", behavior: "smooth" });
      }) });
  }
  if (e.arabicShown) {
    list.push({ id: "lang", group: "actions", label: e.t("shell.actLang"),
      hint: "", icon: "chevronEnd", keywords: "arabic english language",
      run: e.toggleLang });
  }
  return list;
}

function people(e: Env): Command[] {
  const company = e.state.role === "hr" || e.state.role === "gm";
  const fromIssues = !company ? [] : openIssues(e.data, e.state)
    .filter((i) => i.employeeId !== null).map((i): Command => {
      const who = e.data.employee(i.employeeId ?? "");
      return { id: `issue:${i.id}`, group: "people", icon: "alert",
        label: e.t("shell.actIssue", { name: who.name[e.lang] }),
        hint: i.title[e.lang],
        keywords: `${who.name.en} ${who.name.ar} ${i.title.en} ` +
          i.reason.en,
        run: () => onHome(e, () =>
          e.dispatch({ type: "focus-issue", id: i.id })) };
    });
  const fromApprovals = !company ? [] : pendingApprovals(e.data, e.state)
    .map((a): Command => {
      const who = e.data.employee(a.employeeId ?? a.makerId);
      return { id: `approval:${a.id}`, group: "people", icon: "check",
        label: e.t("shell.actApproval", { title: a.title[e.lang] }),
        hint: who.name[e.lang],
        keywords: `${who.name.en} ${who.name.ar} ${a.title.en} approve`,
        run: () => onHome(e, () => focusApproval(a.id)) };
    });
  const profiles = !e.peopleShown ? [] : visibleIds(e.data, e.state)
    .flatMap((id): Command[] => {
      const x = e.data.people.person(id);
      return x === null ? [] : [{ id: `person:${id}`, group: "people",
        icon: "user", label: x.name[e.lang], hint: x.role[e.lang],
        keywords: `${x.name.en} ${x.name.ar} ${x.department.en} ` +
          `${x.number} profile`, run: () => navigate("people", id) }];
    });
  return [...fromIssues, ...fromApprovals, ...profiles];
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
