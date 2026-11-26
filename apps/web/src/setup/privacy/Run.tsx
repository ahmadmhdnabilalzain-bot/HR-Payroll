import b from "../../ui/button.module.css";
import { FilterList } from "../../ui/templates";
import { useToast } from "../../ui/Toast";
import { Status, usePrivacyView } from "./common";
import s from "./privacy.module.css";

/**
 * S26: which leaver records a retention run would remove today, from
 * the periods on the Privacy and retention page. It asks for sign-off.
 * Nothing is deleted in the demo.
 */
export function Run() {
  const v = usePrivacyView();
  const toast = useToast();
  const rows = v.src.run(v.months);
  const due = rows.filter((r) => r.state === "due").length;
  const signed = v.state.retentionSignoff;
  const sign = (): void => {
    v.dispatch({ type: "retention-sign", stamp: v.stamp() });
    toast.show("Retention run signed off. Nothing was deleted in this " +
      "demo.", () => v.dispatch({ type: "retention-unsign" }));
  };
  const lede = signed !== null
    ? `Signed off by ${v.stampText(signed)}. Nothing was deleted in this ` +
      "demo."
    : due === 0 ? "No leaver record is past its period today. Shorten a " +
      "period on the Privacy and retention page to see rows here."
      : `${due} ${due === 1 ? "record" : "records"} would be removed. ` +
        "Nothing is deleted in this demo.";
  const action = signed !== null ? (v.canEdit && (
    <button type="button" className={`${b.btn} ${b.secondary} ${s.tap}`}
      onClick={() => v.dispatch({ type: "retention-unsign" })}>
      Reopen the run</button>)) : v.canEdit && (
    <button type="button" className={`${b.btn} ${b.primary} ${s.tap}`}
      disabled={due === 0}
      title={due === 0 ? "Nothing is due." : undefined}
      onClick={sign}>Sign off the run</button>);
  return (
    <FilterList title="Retention run" lede={lede} rows={rows}
      rowKey={(r) => r.id} searchText={(r) => `${r.name} ${r.category}`}
      actions={action === false ? undefined : action}
      segments={[{ id: "all", label: "All", match: () => true },
      { id: "due", label: "Would be removed",
        match: (r) => r.state === "due" },
      { id: "keep", label: "Kept", match: (r) => r.state === "keep" }]}
      columns={[
        { key: "n", label: "Leaver", render: (r) => r.name },
        { key: "c", label: "Kind of data", render: (r) => r.category },
        { key: "l", label: "Left", render: (r) => r.leftOn.display },
        { key: "u", label: "Kept until", render: (r) => r.keepUntil.display },
        { key: "s", label: "Result", end: true, render: (r) => r.state ===
          "due" ? <Status tone="warn">{signed !== null
            ? "Signed off" : "Would be removed"}</Status>
          : <Status tone="ok">Kept</Status> },
      ]}
      empty="No leaver records." />
  );
}
