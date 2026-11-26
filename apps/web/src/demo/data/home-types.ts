import type { Fils } from "@payroll/engine";
import type {
  AccessApiKey,
  AccessReview,
  AccessWebhook,
  HomeNotice,
  HomeNotification,
  HomeTask,
  ImportSample,
  MyDocumentView,
  TeamTodayRow,
} from "@payroll/demo-data";
import type { Role } from "../state";

export type {
  AccessApiKey,
  AccessReview,
  AccessWebhook,
  HomeNotice,
  HomeNotification,
  HomeTask,
  MyDocumentView,
  TeamTodayRow,
};

/** One past month of the viewer's own pay (Jan to Sep 2026, paid). */
export interface MyPayslipRow {
  /** `YYYY-MM`. */
  month: string;
  grossFils: Fils;
  netFils: Fils;
}

export interface ChainCheck {
  ok: boolean;
  /** 1-based position of the first entry that does not match. */
  brokenAt: number | null;
  checked: number;
}

/** What the IT manager's Home reads (WP9 and WP7 data). */
export interface ItOverview {
  review: AccessReview;
  keys: AccessApiKey[];
  hooks: AccessWebhook[];
  importSummary: ImportSample["summary"];
  importText: string;
  /** Entries in the audit chain. */
  auditCount: number;
  /** Walks the chain again, entry by entry (real SHA-256). */
  verifyChain(): ChainCheck;
}

/**
 * Home and Me (WP10), from the package's wp10 selectors. Texts are the
 * package's, with banned claim words reworded (clean() in home.ts).
 * Tasks and notifications are the data's; the demo's own actions
 * (decisions, done, read) are laid over them in home/inbox/model.ts.
 */
export interface HomeData {
  tasks(role: Role): HomeTask[];
  notifications(role: Role): HomeNotification[];
  notices(role: Role): HomeNotice[];
  teamToday(managerId: string): TeamTodayRow[];
  documents(employeeId: string): MyDocumentView[];
  payslips(employeeId: string): MyPayslipRow[];
  it(): ItOverview;
}
