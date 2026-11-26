import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import { History, type HistoryItem } from "../papers/History";
import { NotFound } from "../papers/Outside";
import { Stack, Status } from "../papers/Status";
import { personFor } from "../../demo/time-off";
import { codeRows, whenOf, type CodeRow } from "./model";
import v from "./verify.module.css";
import { STATUS_TONE, V } from "./words";

const LIST = hrefOf("people", "verify", "letters");

/** P34: every letter that carries a code, and its state. */
export function Codes() {
  const { data, state } = useDemo();
  const { lang } = useLocale();
  const rows = codeRows(data, state);
  const nameOf = (id: string): string =>
    data.people.person(id)?.name[lang] ?? id;
  return (
    <FilterList title={V.codesTitle} lede={V.codesLede} rows={rows}
      rowKey={(l) => l.id}
      searchText={(l) => `${l.display.kind} ${nameOf(l.employeeId)} ${
        l.code}`}
      rowHref={(l) => hrefOf("people", "verify", "letters", l.id)}
      segments={[
        { id: "all", label: V.all, match: () => true },
        { id: "valid", label: V.valid, match: (l) => l.status === "valid" },
        { id: "withdrawn", label: V.withdrawn, match: (l) =>
          l.status === "withdrawn" },
      ]}
      columns={[
        { key: "k", label: V.letter, render: (l) => (
          <Stack main={l.display.kind} sub={nameOf(l.employeeId)} />) },
        { key: "c", label: V.code, render: (l) => (
          <span className={v.code}>{l.code}</span>) },
        { key: "i", label: V.issued,
          render: (l) => whenOf(l.issuedOn.iso, lang) },
        { key: "s", label: V.status, render: (l) => (
          <Status word={l.display.status}
            tone={STATUS_TONE[l.status]} />) },
      ]}
      empty={V.codesEmpty}
      actions={(
        <a className={`${b.btn} ${b.primary}`}
          href={hrefOf("people", "verify", "check")}>{V.checkOpen}</a>
      )} />
  );
}

/** One code: what a bank sees, the details, and withdrawing it. */
export function CodeRecord(props: { id: string }) {
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const l = codeRows(data, state).find((x) => x.id === props.id);
  if (l === undefined) {
    return <NotFound what="letter" back={V.back} href={LIST} />;
  }
  const nameOf = (id: string): string =>
    data.people.person(id)?.name[lang] ?? id;
  const roleOf = (id: string): string =>
    data.people.person(id)?.role[lang] ?? "";
  const me = personFor(data, state.role);
  const withdraw = (): void => {
    dispatch({ type: "verify-withdraw", id: l.id, who: { by: me,
      role: state.role, on: data.verify.asOf } });
    toast.show(V.withdrawn1, () =>
      dispatch({ type: "verify-restore", id: l.id }));
  };
  const restore = (): void => {
    const prev = l.step;
    dispatch({ type: "verify-restore", id: l.id });
    toast.show(V.restored1, prev === null ? undefined : () =>
      dispatch({ type: "verify-withdraw", id: l.id, who: prev }));
  };
  // A sample withdrawal (no step) has nothing to restore.
  const actions = l.status === "valid" ? (
    <button type="button" className={`${b.btn} ${b.primary}`}
      onClick={withdraw}>{V.withdraw}</button>
  ) : l.step !== null ? (
    <button type="button" className={`${b.btn} ${b.secondary}`}
      onClick={restore}>{V.restore}</button>
  ) : undefined;
  return (
    <RecordTabs title={l.display.kind} back={{ label: V.back, href: LIST }}
      lede={`${nameOf(l.employeeId)}, ${roleOf(l.employeeId)}`}
      stats={[{ label: V.code, value: l.code },
        { label: V.status, value: l.display.status },
        { label: V.issued, value: whenOf(l.issuedOn.iso, lang) }]}
      actions={actions}
      tabs={[
        { id: "bank", label: V.preview, render: () => (
          <div className={v.panel}>
            <div className={v.result}>
              <h2>{l.status === "valid" ? V.validTitle
                : V.withdrawnTitle}</h2>
              <p>{l.statement}</p>
            </div>
            <p className={v.note}>{V.previewHelp}</p>
          </div>) },
        { id: "details", label: V.details, render: () => (
          <KeyValues items={[
            { label: "Person", value: <a href={hrefOf("people",
              l.employeeId)}>{nameOf(l.employeeId)}</a> },
            { label: "Issued by", value: l.issuedBy },
            { label: V.code, value: l.code },
          ]} />) },
        { id: "history", label: V.history, render: () => (
          <History items={historyOf(l, lang, nameOf, roleOf)} />) },
      ]} />
  );
}

function historyOf(l: CodeRow, lang: "en" | "ar",
  nameOf: (id: string) => string, roleOf: (id: string) => string)
  : HistoryItem[] {
  const out: HistoryItem[] = [{ text: "Issued with this code",
    when: whenOf(l.issuedOn.iso, lang), tone: "ok" }];
  if (l.status === "withdrawn") {
    out.push({ text: l.step === null ? "Code withdrawn"
      : `Code withdrawn by ${nameOf(l.step.by)}, ${roleOf(l.step.by)}`,
    when: l.withdrawnOn === null ? "" : whenOf(l.withdrawnOn.iso, lang),
    tone: "quiet" });
  }
  return out;
}
