import {
  buildDemoCompany,
  connectPages,
  type ConnectPage,
} from "@payroll/demo-data";

/** The connection pages (a lazy chunk): the package's selectors. */
export interface SetupMoreSource {
  pages: ConnectPage[];
}

export function buildSetupMoreSource(): SetupMoreSource {
  return { pages: connectPages(buildDemoCompany()) };
}
