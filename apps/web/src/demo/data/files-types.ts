import type { Fils } from "@payroll/engine";
import type {
  AskSeed,
  CheckDay,
  ClockSite,
  CoverCheck,
  CoverLeave,
  Encashable,
  EncashQuote,
  ExitInterview,
  ExitQuestion,
  ExitReason,
  LiabilityRow,
  OnFile,
  PhoneEntry,
  SignDoc,
  WfhRow,
} from "@payroll/demo-data";

/**
 * Exit interviews, signatures, documents and the leave and attendance
 * extras (WP17), as the screens read them. Built in files.ts, which
 * only adapter.ts imports. Package shapes are re-exported as types so
 * screens never import the package.
 */
export type {
  AskSeed,
  CheckDay,
  ClockSite,
  CoverCheck,
  CoverLeave,
  Encashable,
  EncashQuote,
  ExitInterview,
  ExitQuestion,
  ExitReason,
  LiabilityRow,
  OnFile,
  PhoneEntry,
  SignDoc,
  WfhRow,
};

export interface FilesData {
  /** The demo day, ISO, for stamping what is done in the browser. */
  asOf: string;
  exit: {
    interviews(): ExitInterview[];
    candidates(): { id: string; name: string; title: string }[];
    reasons: readonly ExitReason[];
    questions: readonly ExitQuestion[];
    scale: string;
  };
  sign: { docs(): SignDoc[]; note: string };
  files: { onFile(): OnFile[]; types: readonly string[]; note: string };
  leave: {
    encashable(): Encashable[];
    quote(employeeId: string, halves: number): EncashQuote;
    seeds(): AskSeed[];
    liability(): LiabilityRow[];
    rate(employeeId: string): Fils;
    halves(from: string, to: string): number;
    encashNote: string;
    liabilityNote: string;
    recordNote: string;
  };
  clock: {
    checkDays(): CheckDay[];
    statuses: readonly string[];
    sites(): ClockSite[];
    phone(): PhoneEntry[];
    geofenceNote: string;
    wfh(): WfhRow[];
    wfhNote: string;
  };
  cover: {
    leave(): CoverLeave[];
    check(extra?: { employeeId: string; from: string; to: string })
      : CoverCheck;
    note: string;
  };
}
