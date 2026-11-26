import type { DocumentKind } from "@payroll/contract";

/** Ids only, never amounts: the documents module reads what it needs. */
export interface DocumentRequest {
  companyId: string;
  exitId: string;
  employeeId: string;
  kind: DocumentKind;
  lang: "en" | "ar";
}

export type DocumentResult =
  | { status: "generated"; documentRef: string }
  | { status: "not-configured" };

/** Document generation is a hook (Ruling 18): not configured yet. */
export interface DocumentPort {
  generate(r: DocumentRequest): Promise<DocumentResult>;
}

export const notConfiguredDocuments: DocumentPort = {
  generate: async () => ({ status: "not-configured" }),
};
