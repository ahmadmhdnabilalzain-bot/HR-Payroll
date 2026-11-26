import type { ReactNode } from "react";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { PageHead } from "../ui/templates";
import tp from "../ui/templates/templates.module.css";
import s from "./Reports.module.css";

/**
 * These reports name people and pay: HR and the General manager only.
 * A deep link from another role lands here, not on the figures.
 */
export function Guard(p: { children: ReactNode; gmOnly?: boolean;
  itOk?: boolean }) {
  const { state } = useDemo();
  const allowed = state.role === "gm" ||
    (state.role === "hr" && p.gmOnly !== true) ||
    (state.role === "it" && p.itOk === true);
  if (allowed) return <>{p.children}</>;
  return (
    <div className={tp.page}>
      <PageHead title="This report is outside your view" />
      <p className={s.sub}>
        {p.gmOnly === true ? "It is for the General manager."
          : "It is for the HR manager and the General manager."}
        {" "}<a href={hrefOf("home")}>Back to Home</a>
      </p>
    </div>
  );
}
