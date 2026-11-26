import {
  accountMapping,
  buildDemoCompany,
  costCentres,
  employeeSync,
  erpPages,
  postingCsv,
  postingPreview,
  teamsCards,
  type CostCentre,
  type ErpPage,
  type MappingRow,
  type PostingPreview,
  type SyncRow,
  type TeamsCard,
} from "@payroll/demo-data";

/** The ERP, ledger and Teams pages (a lazy chunk): package selectors. */
export interface SetupErpSource {
  pages: ErpPage[];
  mapping: MappingRow[];
  centres: CostCentre[];
  sync: SyncRow[];
  posting: PostingPreview;
  csv: string;
  /** The same file with the debit and credit cells blanked. */
  csvMasked: string;
  cards: TeamsCard[];
}

export function buildSetupErpSource(): SetupErpSource {
  const c = buildDemoCompany();
  const posting = postingPreview(c);
  return { pages: erpPages(c), mapping: accountMapping(),
    centres: costCentres(c), sync: employeeSync(c), posting,
    csv: postingCsv(posting), csvMasked: postingCsv({ ...posting,
      lines: posting.lines.map((l) => ({ ...l, cells: l.cells.map(
        (v, i) => (i === 6 || i === 7) && v !== "" ? "masked" : v) })) }),
    cards: teamsCards(c) };
}
