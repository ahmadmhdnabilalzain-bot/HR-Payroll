import type { Fils } from "@payroll/engine";
import type {
  AnalysisDataset,
  AnalysisResult,
  ContractCheck,
  CustomField,
  ElementReport,
  ParallelCompare,
  ParallelSample,
  PayrollJournal,
  SignOffRow,
  WhatIfChange,
  WhatIfResult,
} from "@payroll/demo-data";
import type { Explanation } from "../../components/explain/types";

/**
 * Payroll extras (WP16): pay elements, the journal view, analysis,
 * the sign-off report, what-if, the parallel run and contract checks,
 * as the screens read them. Built in payroll-extras.ts (a lazy chunk
 * with the engine). Types are the package's own, re-exported so the
 * screens never import the package.
 */
export type {
  AnalysisDataset,
  AnalysisResult,
  ContractCheck,
  CustomField,
  ElementReport,
  ParallelCompare,
  ParallelSample,
  PayrollJournal,
  SignOffRow,
  WhatIfChange,
  WhatIfResult,
};

export interface ExtrasPerson { id: string; name: string;
  department: string; hasOvertime: boolean;
  /** October basic as run, fils. */
  basic: Fils }

export interface ExtrasSource {
  elements: ElementReport;
  /** Earnings in October, element by element. */
  elementsExplain: Explanation;
  /** Each side of a journal, line by line. */
  journalExplain(j: PayrollJournal): { debits: Explanation;
    credits: Explanation };
  /** The journal for the IBANs entered so far (held pay moves). */
  journal(ibans: Readonly<Record<string, string>>): PayrollJournal;
  datasets: AnalysisDataset[];
  analyse(dataset: string, dim: string, measure: string): AnalysisResult;
  signOffs: SignOffRow[];
  whatIf(w: WhatIfChange, ibans: Readonly<Record<string, string>>)
    : WhatIfResult;
  /** Overtime minutes the what-if may add, at most. */
  whatIfMaxMinutes: number;
  people: ExtrasPerson[];
  samples: ParallelSample[];
  compare(csv: string): ParallelCompare;
  contracts: ContractCheck;
  fields: CustomField[];
  fieldLimits: string;
  varianceLimitPct: number;
  varianceLimitText: string;
}
