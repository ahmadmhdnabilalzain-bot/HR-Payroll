import type { DemoData } from "../demo/data/types";
import { openIssues, pendingApprovals, personOf } from "../demo/derive";
import { navigate } from "../demo/route";
import type { Action, DemoState, Role } from "../demo/state";
import type { AreaRoute } from "../nav/types";
import { canSeePay, visibleIds } from "../demo/time-off";
import type { RunApproval } from "../demo/actions";
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
  /** Every reachable area of the registry, for "go to". */
  areas: { id: string; label: string; hint: string; icon: IconName;
    keywords: string; route: AreaRoute }[];
  /** True when the People view exists (profiles are searchable). */
  peopleShown: boolean;
  payRunShown: boolean;
  timeOffShown: boolean;
  /** The shared pay run approval (the same one Home and Pay run use). */
  run: RunApproval;
  /** "October", for "Approve October pay". */
  month: string;
}

function focusApproval(id: string): void {
  const el = document.getElementById(`approval-${id}`);
  el?.scrollIntoView({ block: "center", behavior: "smooth" });
  el?.querySelector<HTMLButtonElement>("button:last-child")
    ?.focus({ preventScroll: true });
}

const ROLES: Role[] = ["hr", "gm", "it", "manager", "employee"];
const ROLE_KEY: Record<Role, MessageKey> = { hr: "shell.roleHr",
  gm: "shell.roleGm", it: "shell.roleIt", manager: "shell.roleManager",
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

/**
 * The three things people come to do, first under "Do": sign off the
 * month's pay (the shared run approval, only for the one who decides),
 * enter the missing bank details, and open one's own payslip.
 */
function doFirst(e: Env, company: boolean): Command[] {
  const list: Command[] = [];
  if (e.run.canDecide) {
    list.push({ id: "approve-run", group: "actions",
      label: e.t("shell.actApprove", { month: e.month }), hint: "",
      icon: "check", keywords: "approve pay run sign off",
      run: () => e.run.decide("approve") });
  }
  const iban = !company ? [] : openIssues(e.data, e.state)
    .filter((i) => i.fixKind === "enter-iban");
  const first = iban[0];
  if (first !== undefined) {
    list.push({ id: "bank", group: "actions", label: e.t("shell.actBank"),
      hint: e.t("shell.actBankHint", { count: iban.length }),
      icon: "alert", keywords: "iban bank account details held",
      run: () => onHome(e, () =>
        e.dispatch({ type: "focus-issue", id: first.id })) });
  }
  const me = personOf(e.data, e.state.role);
  if (e.peopleShown && e.data.people.payslip(me) !== null) {
    list.push({ id: "my-payslip", group: "actions",
      label: e.t("shell.actMyPayslip"), hint: e.month, icon: "file",
      keywords: "my payslip pay salary", run: () =>
        navigate("people", me, "payslip") });
  }
  return list;
}

function actions(e: Env): Command[] {
  const company = e.state.role === "hr" || e.state.role === "gm";
  const list: Command[] = e.areas.map((a) => ({ id: `go:${a.id}`,
    group: "go", label: a.label, hint: a.hint, icon: a.icon,
    keywords: `go open ${a.keywords}`,
    run: () => navigate(a.route.section, ...(a.route.rest ?? [])) }));
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
  if (e.timeOffShown && !company) {
    list.push({ id: "request-leave", group: "actions",
      label: e.t("shell.actRequestLeave"), hint: "", icon: "calendar",
      keywords: "leave holiday vacation request time off",
      run: () => navigate("time-off") });
  }
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
  return [...doFirst(e, company), ...list];
}

function people(e: Env): Command[] {
  const company = e.state.role === "hr" || e.state.role === "gm";
  const fromIssues = !company ? [] : openIssues(e.data, e.state)
    .filter((i) => i.employeeId !== null).map((i): Command => {
      const who = e.data.employee(i.employeeId ?? "");
      return { id: `issue:${i.id}`, group: "people", icon: "alert",
        label: i.fixKind === "enter-iban"
          ? e.t("shell.actIban", { name: who.name[e.lang] })
          : e.t("shell.actIssue", { name: who.name[e.lang] }),
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
  const payslips = !e.peopleShown ? [] : visibleIds(e.data, e.state)
    .filter((id) => canSeePay(e.data, e.state, id) &&
      e.data.people.payslip(id) !== null).flatMap((id): Command[] => {
      const x = e.data.people.person(id);
      return x === null ? [] : [{ id: `payslip:${id}`, group: "people",
        icon: "file", label: e.t("shell.actPayslip", { name: x.name[e.lang] }),
        hint: x.role[e.lang], keywords: `${x.name.en} ${x.name.ar} payslip ` +
          "pay salary", run: () => navigate("people", id, "payslip") }];
    });
  return [...fromIssues, ...fromApprovals, ...profiles, ...payslips];
}

/** Do, then people with open items, then the pages to go to. */
export const GROUP_ORDER: Group[] = ["actions", "people", "go"];

export function commands(e: Env): Command[] {
  const all = [...actions(e), ...people(e)];
  return GROUP_ORDER.flatMap((g) => all.filter((c) => c.group === g));
}

/** Every word of the query must appear in the label, hint or keywords. */
export function matches(c: Command, query: string): boolean {
  const hay = `${c.label} ${c.hint} ${c.keywords}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean)
    .every((w) => hay.includes(w));
}
