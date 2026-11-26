import {
  RESPONSE_DAYS_DEFAULT,
  REQUEST_KINDS,
  PRIVACY_NOTICE,
  buildDemoCompany,
  privacyCategories,
  retentionRun,
  subjectRequests,
  type PrivacyCategory,
  type RetentionRow,
  type SubjectRequest,
} from "@payroll/demo-data";

/** The privacy pages' data (a lazy chunk): the package's selectors. */
export interface PrivacySource {
  notice: string;
  categories: PrivacyCategory[];
  defaultDays: number;
  kinds: typeof REQUEST_KINDS;
  requests(days: number): SubjectRequest[];
  run(months: Record<string, number>): RetentionRow[];
}

export function buildPrivacySource(): PrivacySource {
  const c = buildDemoCompany();
  return { notice: PRIVACY_NOTICE, categories: privacyCategories(c),
    defaultDays: RESPONSE_DAYS_DEFAULT, kinds: REQUEST_KINDS,
    requests: (days) => subjectRequests(c, days),
    run: (months) => retentionRun(c, months) };
}
