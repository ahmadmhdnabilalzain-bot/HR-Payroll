import { FilterList } from "../../ui/templates";
import { Status, monthsText, usePrivacyView } from "./common";
import s from "./privacy.module.css";

/** S26: the personal data kept, why, for how long, who can see it. */
export function Register() {
  const v = usePrivacyView();
  const rows = v.src.categories;
  return (
    <FilterList title="Personal data kept"
      lede={`${v.src.notice} The ground for each is how we read Article 4 ` +
        "of the UAE personal data law, to confirm with counsel."}
      rows={rows} rowKey={(c) => c.id}
      searchText={(c) => `${c.name} ${c.holds} ${c.why}`}
      columns={[
        { key: "n", label: "Kind of data", render: (c) => (
          <>{c.name}{c.sensitive && (
            <small className={s.small}>
              <Status tone="warn">Sensitive: health</Status></small>)}
            <small className={s.small}>{c.holds}</small>
            <small className={s.small}>Why: {c.why}</small>
            <small className={s.small}>{c.basis}</small>
            <small className={s.small}>Seen by {c.seenBy.join(", ")}
            </small></>) },
        { key: "k", label: "Kept", end: true, render: (c) => (
          <>{monthsText(v.months[c.id]!)}
            <small className={s.small}>Sample, to confirm with counsel
            </small></>) },
      ]}
      empty="Nothing is listed." />
  );
}
