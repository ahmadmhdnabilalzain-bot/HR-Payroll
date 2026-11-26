import { useDemo } from "../demo/state";
import { personFor } from "../demo/time-off";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { FilterList } from "../ui/templates";
import { useToast } from "../ui/Toast";
import { inboxTasks } from "../home/inbox/model";
import i from "../home/inbox/inbox.module.css";

/** Fewer days than this reads "Check" (HR's own renewal window). */
const CHECK_DAYS = 30;

/**
 * E05: the viewer's documents with plain dates. When HR asked for new
 * papers (a document task), the one action marks them sent, the same
 * task Home lists, with an undo.
 */
export function MyDocuments() {
  const { t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const me = personFor(data, state.role);
  const rows = data.home.documents(me);
  const task = inboxTasks(data, state).find((x) =>
    x.source.kind === "document");
  const action = task === undefined ? undefined : task.done ? (
    <span className={i.meta} role="status">{t("me.sentDone")}</span>
  ) : (
    <button type="button" className={`${b.btn} ${b.primary}`}
      onClick={() => {
        dispatch({ type: "task-done", id: task.id });
        toast.show(t("me.sentToast"), () =>
          dispatch({ type: "task-undone", id: task.id }));
      }}>
      {t("me.sentPapers")}
    </button>
  );
  return (
    <FilterList title={t("me.documentsTitle")}
      lede={task === undefined ? t("me.documentsLede")
        : `${task.title}. ${task.dueText}.`}
      actions={action} rows={rows} rowKey={(x) => x.id}
      columns={[
        { key: "d", label: t("me.colDocument"), render: (x) =>
          x.kindText.charAt(0).toUpperCase() + x.kindText.slice(1) },
        { key: "n", label: t("me.colNumber"), render: (x) => x.number },
        { key: "e", label: t("me.colExpires"), render: (x) =>
          `${x.expiresOn.display}, ${t("me.daysLeft", {
            count: x.daysLeft })}` },
        { key: "s", label: t("me.colStatus"), end: true, render: (x) => (
          <span className={i.status} data-tone={x.daysLeft <= CHECK_DAYS
            ? "warn" : "good"}>
            {x.daysLeft <= CHECK_DAYS ? t("me.docCheck") : t("me.docValid")}
          </span>) }]}
      empty={t("me.documentsEmpty")} />
  );
}
