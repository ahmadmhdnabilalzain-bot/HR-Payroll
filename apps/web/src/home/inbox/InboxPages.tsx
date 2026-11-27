import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import { useMaskText } from "../../ui/mask";
import { FilterList } from "../../ui/templates";
import { saveView, savedView } from "../../ui/templates/listMotion";
import { useState } from "react";
import {
  inboxNotices, inboxTasks, type InboxTask, type TaskTone,
} from "./model";
import { TaskAction, TaskTitle, TONE_KEY } from "./TaskList";
import s from "./inbox.module.css";

/** The status words Home's To do opens the list on. */
export const TASK_TONES: readonly TaskTone[] = ["overdue", "soon", "later"];

/**
 * `#/home/tasks`: every task for the role (LF), open first.
 * `#/home/tasks/<tone>` (overdue, soon, later) opens it on that status,
 * as Home's status words do.
 */
export function TasksPage(p: { tone?: string | undefined }) {
  const mask = useMaskText();
  const { t } = useLocale();
  const { data, state } = useDemo();
  const rows = inboxTasks(data, state);
  const tone = TASK_TONES.find((x) => x === p.tone);
  // The list starts on the status asked for (once; the person's own
  // choice wins after that).
  useState(() => {
    if (tone !== undefined && savedView() === undefined) {
      saveView(location.hash, { q: "", seg: tone });
    }
  });
  const open = rows.filter((x) => !x.done).length;
  const done = rows.length - open;
  const summary = [{ label: t("inbox.tasksOpen"), value: open },
    { label: t("inbox.tasksDone"), value: done }]
    .filter((x) => x.value > 0);
  return (
    <FilterList title={t("inbox.tasksTitle")} lede={t("inbox.tasksLede")}
      crumbs={[{ label: t("inbox.backHome"), href: hrefOf("home") }]}
      rows={rows} rowKey={(x) => x.id}
      searchText={(x) => `${x.title} ${x.detail}`}
      summary={summary.length > 0 ? summary
        : [{ label: t("tpl.inList"), value: rows.length }]}
      segments={[
        { id: "open", label: t("inbox.tasksOpen"), match: (x) => !x.done },
        ...TASK_TONES.map((k) => ({ id: k, label: t(TONE_KEY[k]),
          match: (x: InboxTask) => x.tone === k })),
        { id: "done", label: t("inbox.tasksDone"), match: (x) => x.done },
        { id: "all", label: t("inbox.tasksAll"), match: () => true }]}
      columns={[
        { key: "task", label: t("inbox.colTask"), render: (x) => (
          <span className={s.main}>
            <TaskTitle task={x} />
            <span className={s.meta}>{mask(x.detail)}</span>
          </span>) },
        { key: "due", label: t("inbox.colDue"), render: (x) => x.dueText },
        { key: "status", label: t("inbox.colStatus"), render: (x) => (
          <span className={s.status} data-tone={x.tone}>
            {t(TONE_KEY[x.tone])}
          </span>) },
        { key: "act", label: t("inbox.colAction"), end: true,
          render: (x) => <TaskAction task={x} /> }]}
      empty={t("inbox.tasksEmpty")} />
  );
}

/** `#/home/notices`: every notice the viewer's place sees (LF). */
export function NoticesPage() {
  const mask = useMaskText();
  const { t } = useLocale();
  const { data, state } = useDemo();
  const rows = inboxNotices(data, state);
  return (
    <FilterList title={t("inbox.notices")} lede={t("inbox.noticesLede")}
      crumbs={[{ label: t("inbox.backHome"), href: hrefOf("home") }]}
      rows={rows} rowKey={(x) => x.id}
      searchText={(x) => `${x.title} ${x.body}`}
      columns={[
        { key: "notice", label: t("inbox.colNotice"), render: (x) => (
          <span className={s.main}>
            <span className={s.what}>{x.title}</span>
            <span className={s.meta}>{mask(x.body)}</span>
          </span>) },
        { key: "posted", label: t("inbox.colPosted"), render: (x) =>
          t("inbox.postedBy", { name: x.postedBy.name,
            date: x.postedOn.display }) },
        { key: "for", label: t("inbox.colAudience"),
          render: (x) => x.pinned ? `${x.audienceText} · ` +
            t("inbox.pinned") : x.audienceText }]}
      empty={t("inbox.noticesEmpty")} />
  );
}
