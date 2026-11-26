import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import { FilterList } from "../../ui/templates";
import { inboxNotices, inboxTasks } from "./model";
import { TaskAction, TaskTitle, TONE_KEY } from "./TaskList";
import s from "./inbox.module.css";

/** `#/home/tasks`: every task for the role (LF), open first. */
export function TasksPage() {
  const { t } = useLocale();
  const { data, state } = useDemo();
  const rows = inboxTasks(data, state);
  return (
    <FilterList title={t("inbox.tasksTitle")} lede={t("inbox.tasksLede")}
      crumbs={[{ label: t("inbox.backHome"), href: hrefOf("home") }]}
      rows={rows} rowKey={(x) => x.id}
      searchText={(x) => `${x.title} ${x.detail}`}
      segments={[
        { id: "open", label: t("inbox.tasksOpen"), match: (x) => !x.done },
        { id: "done", label: t("inbox.tasksDone"), match: (x) => x.done },
        { id: "all", label: t("inbox.tasksAll"), match: () => true }]}
      columns={[
        { key: "task", label: t("inbox.colTask"), render: (x) => (
          <span className={s.main}>
            <TaskTitle task={x} />
            <span className={s.meta}>{x.detail}</span>
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
            <span className={s.meta}>{x.body}</span>
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
