import { Suspense } from "react";
import type { LeaverChecklistView } from "../../demo/data/moves-types";
import { Explainable } from "../../components/explain";
import { useRunDetail } from "../../demo/useRunDetail";
import { Money } from "../../ui/Money";
import s from "./moves.module.css";

/**
 * The leaver's final settlement: the total from the run's settlement
 * (paid outside the pay run and the salary file), the gratuity inside
 * it opens its working, and what is not worked out is said plainly.
 */
export function Settlement(p: { leaver: LeaverChecklistView }) {
  const l = p.leaver;
  return (
    <div className={s.settle}>
      <div className={s.settleTotal}>
        <span>Final settlement so far</span>
        <Money value={l.settlement.total.value} size="hero" />
        <span className={s.quiet}>{l.settlement.statusText}</span>
      </div>
      <Suspense fallback={<p className={s.quiet}>Loading the working</p>}>
        <Working leaver={l} />
      </Suspense>
    </div>
  );
}

function Working(p: { leaver: LeaverChecklistView }) {
  const detail = useRunDetail();
  const e = detail.explain[`gratuity:${p.leaver.employeeId}`];
  if (e === undefined) return null;
  const gratuity = e.result.value;
  return (
    <div className={s.stack}>
      <ul className={s.group} aria-label="Parts of the settlement">
        <li>
          <div className={s.item}>
            <div className={s.itemMain}>
              <span className={s.itemTitle}>End-of-service gratuity</span>
              <span className={s.itemMeta}>
                Select the amount to see how it is worked out
              </span>
            </div>
            <Explainable explanation={e}>
              {gratuity.kind === "money" ? <Money value={gratuity.fils} />
                : null}
            </Explainable>
          </div>
        </li>
      </ul>
      {e.notComputed.length > 0 && (
        <div className={s.notice}>
          <strong>Not worked out here</strong>
          <ul className={s.lines}>
            {e.notComputed.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
