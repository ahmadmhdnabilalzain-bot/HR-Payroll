import { useState } from "react";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { FilterList, Sheet } from "../../ui/templates";
import {
  packVersions,
  ruleRows,
  STATUS_MEANS,
  STATUS_ORDER,
  STATUS_WORD,
  statusCounts,
  type RuleRow,
} from "./data";
import s from "./rules.module.css";
import { StatusWord } from "./StatusWord";

/** S19: every rule, where it comes from, and what changed. */
export function RuleList() {
  const { lang } = useLocale();
  const { state } = useDemo();
  const [open, setOpen] = useState(false);
  const rows = [...ruleRows()];
  const counts = statusCounts();
  const packs = packVersions();
  const segments = [{ id: "all", label: "All", match: () => true },
    ...STATUS_ORDER.filter((x) => counts[x] > 0).map((x) => ({
      id: x, label: STATUS_WORD[x], match: (r: RuleRow) => r.status === x }))];
  return (
    <>
      <FilterList title="Rules and sources"
        lede={`${rows.length} rules in ${packs.length} rule sets. Each ` +
          "says where it comes from. A rule with no source yet is held " +
          "back until the company enters a value."}
        rows={rows} rowKey={(r) => r.id}
        searchText={(r) => `${r.text} ${r.value} ${r.packName} ` +
          `${STATUS_WORD[r.status]} ${r.sourceNote ?? ""} ${r.key}`}
        rowHref={(r) => hrefOf("setup", "rules", "packs", r.id)}
        segments={segments}
        columns={[
          { key: "t", label: "Rule", render: (r) => r.text },
          { key: "v", label: "Value", render: (r) => r.value },
          { key: "p", label: "Rule set", render: (r) => r.packName },
          { key: "s", label: "Source",
            render: (r) => <StatusWord status={r.status} /> },
        ]}
        empty="No rule matches. Clear the search or choose All."
        actions={<button type="button" className={`${b.btn} ${b.secondary}`}
          onClick={() => setOpen(true)}>Change log</button>} />
      <Sheet open={open} title="Change log" onClose={() => setOpen(false)}>
        <div className={s.sheetBody}>
          <h3>Rule sets in use</h3>
          <ul className={s.history}>
            {packs.map((v) => (
              <li key={v.packId}>
                <span>{v.name}<small>Version {v.version}, {v.rules}
                  {" "}rules. No later version is loaded.</small></span>
                <span className={s.when}>
                  {formatDate(v.effectiveFrom, lang)}</span>
              </li>
            ))}
          </ul>
          <h3>Company changes</h3>
          {state.ruleEdits.length === 0 ? (
            <p>No company changes yet. Edits made on the Setup pages are
              listed here with who made them.</p>
          ) : (
            <ul className={s.history}>
              {state.ruleEdits.map((e) => (
                <li key={e.id}>
                  <span>{e.what}{e.undone ? " (undone)" : ""}
                    <small>{e.who}, {e.role}</small></span>
                  <span className={s.when}>{formatDate(e.on, lang)}</span>
                </li>
              ))}
            </ul>
          )}
          <h3>What the sources mean</h3>
          <ul className={s.history}>
            {STATUS_ORDER.map((x) => (
              <li key={x}><span>{STATUS_WORD[x]}
                <small>{STATUS_MEANS[x]}</small></span></li>
            ))}
          </ul>
        </div>
      </Sheet>
    </>
  );
}
