import { useExtras } from "../../demo/data/payroll-extras-load";
import { approvalBlockedBy } from "../../demo/derive";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { useRunDetail } from "../../demo/useRunDetail";
import { formatList } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { FilterList } from "../../ui/templates";
import { waitingOf } from "../derive";
import { usePay } from "../load";
import { Status } from "../parts";
import { gateChecks, type GateCheck } from "./checks";

const go = (c: GateCheck): string => {
  const [section, ...rest] = c.to;
  return hrefOf(section as Parameters<typeof hrefOf>[0], ...rest);
};

/** R15: what must hold before pay goes out, each pass or stop. */
export function Checks() {
  const { data, state } = useDemo();
  const { lang } = useLocale();
  const d = useRunDetail();
  const x = useExtras();
  const pay = usePay();
  const checks = gateChecks({
    blocked: approvalBlockedBy(data, state).map((id) =>
      data.employee(id).name.en),
    people: d.people, filePeople: d.file.people,
    limitPct: x.varianceLimitPct, limitText: x.varianceLimitText,
    correctionsWaiting: waitingOf(state, ["correction"]),
    correctionsBooked: pay.corrections.length, nextRun: pay.nextRun,
    contracts: x.contracts, holds: state.salaryHolds.length,
    list: (names) => formatList(names, lang),
  });
  const stop = checks.find((c) => !c.pass);
  const stops = checks.filter((c) => !c.pass).length;
  return (
    <FilterList title="Pre-pay checks"
      lede={stops === 0 ? "Every check passes. October can go to the " +
        "General manager." : `${stops} of ${checks.length} checks stop ` +
        "pay. Open a check to put it right; this page follows at once."}
      rows={checks} rowKey={(c) => c.id} rowHref={go}
      segments={[{ id: "all", label: "All", match: () => true },
        { id: "stop", label: "Stop", match: (c) => !c.pass }]}
      actions={stop !== undefined ? (
        <a className={`${b.btn} ${b.primary}`} href={go(stop)}>
          Open the first stop</a>
      ) : (
        <a className={`${b.btn} ${b.primary}`}
          href={hrefOf("pay-run", "approve")}>Go to sign-off</a>
      )}
      columns={[
        { key: "check", label: "Check", render: (c) => c.label },
        { key: "result", label: "Result", render: (c) => (
          <Status tone={c.pass ? "done" : "bad"}>
            {c.pass ? "Pass" : "Stop"}</Status>) },
        { key: "detail", label: "What it found", render: (c) => c.detail },
      ]}
      empty="Nothing stops pay. Choose All to see every check." />
  );
}
