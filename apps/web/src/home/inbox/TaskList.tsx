import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import type { MessageKey } from "../../i18n/t";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { Icon } from "../../ui/Icon";
import { useToSign } from "../../people/esign/ToSignCard";
import { inboxTasks, type InboxTask, type TaskTone } from "./model";
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

export function TaskTitle(p: { task: InboxTask }) {
  return p.task.href === null ? <span className={s.what}>{p.task.title}</span>
    : <a className={s.what} href={p.task.href}>{p.task.title}</a>;
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
            {shown.map((x) => (
              <li key={x.id} className={s.row} data-done={x.done}>
                <div className={s.main}>
                  <TaskTitle task={x} />
                  <span className={s.meta}>{x.dueText}</span>
                </div>
                <div className={s.end}>
                  <span className={s.status} data-tone={x.tone}>
                    {t(TONE_KEY[x.tone])}
                  </span>
                  <TaskAction task={x} />
                </div>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
