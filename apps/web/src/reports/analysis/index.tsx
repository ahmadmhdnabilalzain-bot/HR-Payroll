import { Suspense, type ComponentType } from "react";
import type { ViewProps } from "../../views";
import { AnalysisBuilder } from "./Analysis";
import { Elements } from "./Elements";
import { Journal } from "./Journal";
import { SignOffs } from "./SignOffs";
import s from "../../pay/gate/gate.module.css";

/** Loads the extras chunk behind one quiet line, then the screen. */
const wrap = (V: ComponentType): ComponentType<ViewProps> => {
  function Extras() {
    return (
      <Suspense fallback={<div className={s.page}>
        <p className={s.muted}>Working it out…</p></div>}>
        <V />
      </Suspense>
    );
  }
  return Extras;
};

/** WP16 report screens for the Reports router: HR and General manager. */
export const ANALYSIS_SCREENS: Record<string,
  { view: ComponentType<ViewProps> }> = {
  elements: { view: wrap(Elements) },
  journal: { view: wrap(Journal) },
  analysis: { view: wrap(AnalysisBuilder) },
  "sign-offs": { view: wrap(SignOffs) },
};

export const ANALYSIS_BLURBS: Readonly<Record<string, string>> = {
  "reports.elements": "What did each pay element come to, against last " +
    "month?",
  "reports.journal": "How does October's pay read as debits and credits " +
    "for the finance team?",
  "reports.analysis": "Group payroll, headcount, leave or overtime your " +
    "own way.",
  "reports.sign-offs": "Who signed off what, and when, and what still " +
    "waits?",
};
