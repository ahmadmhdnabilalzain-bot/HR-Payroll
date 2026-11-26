import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { KeyValues, RecordTabs } from "../../ui/templates";
import { packVersions, ruleById, STATUS_MEANS } from "./data";
import s from "./rules.module.css";
import { StatusWord } from "./StatusWord";

/** One rule: its value, its source, and its history. */
export function RuleRecord(p: { id: string }) {
  const { lang } = useLocale();
  const { state } = useDemo();
  const r = ruleById(p.id);
  const back = { label: "Rules and sources",
    href: hrefOf("setup", "rules", "packs") };
  if (r === undefined) {
    return (
      <RecordTabs title="Rule not found" back={back} stats={[]}
        lede="That rule is not in the loaded rule sets." tabs={[]} />
    );
  }
  const edits = state.ruleEdits.filter((e) => e.key === r.id);
  const versions = packVersions().filter((v) => v.packId === r.packId);
  return (
    <RecordTabs title={r.text} back={back}
      stats={[{ label: "Value", value: r.value },
        { label: "Source", value: <StatusWord status={r.status} /> },
        { label: "In force from",
          value: formatDate(r.effectiveFrom, lang) }]}
      tabs={[
        { id: "source", label: "Source", render: () => (
          <>
            <KeyValues items={[
              { label: "What the source is",
                value: r.sourceNote ?? "None. No source gives a value." },
              ...(r.sourceUrl === null ? [] : [{ label: "Address",
                value: r.sourceUrl }]),
              { label: "What this status means",
                value: STATUS_MEANS[r.status] },
              { label: "Rule set",
                value: `${r.packName}, version ${r.version}` },
            ]} />
            <p className={s.note}>The wording above is how we read the
              source. It is not legal advice.</p>
          </>
        ) },
        { id: "history", label: "History", render: () => (
          <ul className={s.history}>
            {edits.map((e) => (
              <li key={e.id}><span>{e.what}{e.undone ? " (undone)" : ""}
                <small>{e.who}, {e.role}</small></span>
                <span className={s.when}>{formatDate(e.on, lang)}</span></li>
            ))}
            {versions.map((v) => (
              <li key={v.version}><span>Version {v.version} in force
                <small>No later version is loaded.</small></span>
                <span className={s.when}>
                  {formatDate(v.effectiveFrom, lang)}</span></li>
            ))}
          </ul>
        ) },
      ]} />
  );
}
