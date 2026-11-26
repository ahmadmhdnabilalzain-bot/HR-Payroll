import { Suspense } from "react";
import { canSeePayRecords } from "../../pay/derive";
import { useDemo } from "../../demo/state";
import { hrefOf } from "../../demo/route";
import { PageHead } from "../../ui/templates";
import type { ViewProps } from "../../views";
import { CustomFields } from "./Fields";
import { ParallelRun } from "./Parallel";
import s from "../../pay/gate/gate.module.css";

/**
 * WP16's Setup screens under `#/setup/migration/<screen>`: the
 * parallel run against the old system, and custom fields. The parallel
 * run shows people's pay, so only HR and the General manager open it
 * (IT reaches every other Setup area HR reaches).
 */
export function SetupMigration(p: ViewProps) {
  const { state } = useDemo();
  const loading = <div className={s.page}>
    <p className={s.muted}>Working it out…</p></div>;
  if (p.rest[1] === "fields") return <CustomFields />;
  if (!canSeePayRecords(state.role)) {
    return (
      <div className={s.page}>
        <PageHead title="This page is outside your view"
          lede={"It shows people's pay: it is for the HR manager and " +
            "the General manager."}
          back={{ label: "Back to Home", href: hrefOf("home") }} />
      </div>
    );
  }
  return <Suspense fallback={loading}><ParallelRun /></Suspense>;
}
