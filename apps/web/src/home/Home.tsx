import { Approvals } from "./Approvals";
import { Departments } from "./Departments";
import { Expiries } from "./Expiries";
import { IssueList } from "./IssueList";
import { PayRunHero } from "./PayRunHero";
import { Setup } from "./Setup";
import { StatusLead } from "./StatusLead";
import s from "./Home.module.css";

/**
 * Home, for HR or the GM. The first screenful answers one question:
 * can October be paid, and what is the one next step. The sentence
 * leads, the figure supports it, progress shows where the run is, and
 * at most three issues stand before approval. Context sits below.
 */
export function Home() {
  return (
    <div className={s.page}>
      <StatusLead />
      <PayRunHero />
      <div className={s.grid}>
        <IssueList />
        <Approvals />
      </div>
      <div className={s.below}>
        <Setup />
        <Expiries />
      </div>
      <Departments />
    </div>
  );
}
