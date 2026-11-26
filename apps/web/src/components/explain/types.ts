import type { ReactNode } from "react";

/**
 * The shared contract for "explain any figure". A screen wraps a
 * figure in <Explainable target={...}>; pressing it asks the provider
 * to open the panel for that target. Any screen (Home, Pay run,
 * People) uses the same contract; the panel itself can be replaced
 * without touching the screens.
 *
 * Today a target is a payslip line (the package's trace line id). The
 * union leaves room for run totals and settlements later.
 */
export type ExplainTarget = {
  kind: "payslip-line";
  payslipId: string;
  traceId: string;
  /** The figure's name as the screen shows it ("Housing allowance"). */
  label: string;
};

export interface ExplainApi {
  /** Open the panel; focus returns to `from` when it closes. */
  open(target: ExplainTarget, from?: HTMLElement | null): void;
  close(): void;
  /** The target shown now, or null when closed. */
  current: ExplainTarget | null;
}

export interface ExplainableProps {
  target: ExplainTarget;
  /** The figure itself, usually a <Money/>. */
  children: ReactNode;
  className?: string;
}

/** The panel: shown for `target`, closed with `onClose`. */
export interface ExplainPanelProps {
  target: ExplainTarget | null;
  onClose(): void;
}
