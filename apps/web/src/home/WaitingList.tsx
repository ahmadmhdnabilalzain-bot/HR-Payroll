import { isBlocking, openIssues, pendingApprovals, personOf }
  from "../demo/derive";
import { useDemo } from "../demo/state";
import type { MessageKey } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import { Avatar } from "../ui/Avatar";
import { Icon } from "../ui/Icon";
import s from "./WaitingList.module.css";

/** Rows on the phone's first screen. */
const ROWS = 3;

const KIND: Record<string, MessageKey> = {
  leave: "home.kindLeave", expense: "home.kindExpense",
  "pay-run": "home.kindPayRun",
};

interface Row {
  key: string;
  personId: string;
  name: string;
  what: string;
  open(): void;
}

/**
 * The phone's short list of what waits for the viewer, at most three
 * rows with faces: decisions that are theirs first, then the open
 * items they can act on (the ones that stop pay first). A row opens
 * its item further down Home. Nothing waiting: no list.
 */
export function WaitingList() {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const me = personOf(data, state.role);
  const decide: Row[] = pendingApprovals(data, state)
    .filter((a) => a.checkerId === me).map((a) => {
      const id = a.employeeId ?? a.makerId;
      return { key: a.id, personId: id,
        name: data.employee(id).name[lang],
        what: a.kind === "pay-run" ? t("home.kindPayRun")
          : `${t(KIND[a.kind] ?? "home.kindLeave")} · ${a.title[lang]}`,
        open: () => document.getElementById(`approval-${a.id}`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" }) };
    });
  const issues = state.role !== "hr" ? [] : openIssues(data, state)
    .filter((i) => i.employeeId !== null)
    .sort((a, b) => Number(isBlocking(b)) - Number(isBlocking(a)));
  const fix: Row[] = issues.map((i) => {
    const id = i.employeeId ?? "";
    return { key: i.id, personId: id, name: data.employee(id).name[lang],
      what: i.title[lang],
      open: () => dispatch({ type: "focus-issue", id: i.id }) };
  });
  const rows = [...decide, ...fix].slice(0, ROWS);
  if (rows.length === 0) return null;
  return (
    <section className={s.box} aria-labelledby="waiting-you">
      <h2 id="waiting-you" className={s.title}>{t("home.waitingYou")}</h2>
      <ul className={s.list}>
        {rows.map((r) => (
          <li key={r.key}>
            <button type="button" className={s.row} onClick={r.open}>
              <Avatar id={r.personId} name={data.employee(r.personId)
                .name.en} size="sm" />
              <span className={s.text}>
                <span className={s.name}>{r.name}</span>
                <span className={s.what}>{r.what}</span>
              </span>
              <Icon name="chevronEnd" size={18} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
