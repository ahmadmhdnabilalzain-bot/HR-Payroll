import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import type { MessageKey } from "../../i18n/t";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { Icon } from "../../ui/Icon";
import { useToSign } from "../../people/esign/ToSignCard";
import { inboxTasks, type InboxTask, type TaskTone } from "./model";
import tl from "../TextLink.module.css";
import s from "./inbox.module.css";

export const TONE_KEY: Record<TaskTone, MessageKey> = {
  overdue: "inbox.toneOverdue", soon: "inbox.toneSoon",
  later: "inbox.toneLater", done: "inbox.toneDone" };

/** Mark done (with undo in the toast), or undo one marked here. */
export function TaskAction(p: { task: InboxTask }) {
  const { t } = useLocale();
  const { dispatch } = useDemo();
  const toast = useToast();
  const x = p.task;
  if (x.done && !x.doneHere) return null;
  if (x.doneHere) {
    return (
      <button type="button" className={`${b.btn} ${b.quiet} ${s.act}`}
        onClick={() => dispatch({ type: "task-undone", id: x.id })}>
        {t("inbox.undo")}
      </button>
    );
  }
  return (
    <button type="button" className={`${b.btn} ${b.quiet} ${s.act}`}
      onClick={() => {
        dispatch({ type: "task-done", id: x.id });
        toast.show(t("inbox.doneToast", { title: x.title }), () =>
          dispatch({ type: "task-undone", id: x.id }));
      }}>
      {t("inbox.markDone")}
    </button>
  );
}

/**
 * The status word ("Overdue", "This week", "Later"): on Home it opens
 * the full list on that status. "Done" stays a word.
 */
export function TaskStatus(p: { tone: TaskTone }) {
  const { t } = useLocale();
  const word = t(TONE_KEY[p.tone]);
  if (p.tone === "done") {
    return <span className={s.status} data-tone={p.tone}>{word}</span>;
  }
  return (
    <a className={`${s.status} ${tl.link}`} data-tone={p.tone}
      href={hrefOf("home", "tasks", p.tone)}>{word}</a>
  );
}

export function TaskTitle(p: { task: InboxTask }) {
  return p.task.href === null ? <span className={s.what}>{p.task.title}</span>
    : <a className={s.what} href={p.task.href}>{p.task.title}</a>;
}

/**
 * One task: the title's link stretches over the whole row (to its
 * screen or, with none, the full list); the status word and Mark done
 * sit above it and keep their own press.
 */
function TaskRow(p: { task: InboxTask }) {
  const x = p.task;
  return (
    <li className={`${s.row} ${s.linkRow} ${s.stretch}`}
      data-done={x.done}>
      <div className={s.main}>
        <a className={`${s.what} ${s.stretched}`}
          href={x.href ?? hrefOf("home", "tasks")}>{x.title}</a>
        <span className={s.meta}>{x.dueText}</span>
      </div>
      <div className={`${s.end} ${s.over}`}>
        <TaskStatus tone={x.tone} />
        <TaskAction task={x} />
      </div>
    </li>
  );
}

/**
 * The role's to-do list on Home: the first few open tasks, each with a
 * status word and dot, a link when its screen is reachable, and Mark
 * done. Decisions and bank details have their own rows, so they are
 * not repeated here.
 */
export function TaskList(p: { limit: number }) {
  const { t } = useLocale();
  const { data, state } = useDemo();
  const all = inboxTasks(data, state);
  const open = all.filter((x) => !x.done || x.doneHere);
  const shown = open.slice(0, p.limit);
  const sign = useToSign();
  return (
    <section className={`${s.panel} ${s.todo}`}
      aria-labelledby="todo-title">
      <header className={s.head}>
        <h2 id="todo-title" className={s.title}>{t("inbox.todo")}</h2>
        {all.length > shown.length && (
          <a className={s.more} href={hrefOf("home", "tasks")}>
            {t("inbox.allTasks")}
          </a>
        )}
      </header>
      {shown.length === 0 && sign.n === 0
        ? <p className={s.empty}>{t("inbox.tasksEmpty")}</p>
        : (
          <ul className={s.list}>
            {sign.n > 0 && (
              <li className={s.row}>
                <a className={s.signRow} href={sign.href}>
                  <span className={s.main}>
                    <span className={s.what}>
                      {t("inbox.signDocs", { count: sign.n })}</span>
                    <span className={s.meta}>{t("inbox.signWait")}</span>
                  </span>
                  <Icon name="chevronEnd" size={18} />
                </a>
              </li>
            )}
            {shown.map((x) => <TaskRow key={x.id} task={x} />)}
          </ul>
        )}
    </section>
  );
}
