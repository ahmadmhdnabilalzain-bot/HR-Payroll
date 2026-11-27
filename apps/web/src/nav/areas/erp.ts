import type { Area } from "../types";

const IT = ["hr", "gm"] as const;

const area = (id: string, en: string, page: string, keywords: string)
  : Area => ({ id, section: "setup", group: "connections",
  label: { en, ar: en }, status: "live", archetype: "ST", roles: IT,
  route: { section: "setup", rest: ["erp", page] }, keywords });

/**
 * WP26: ERP, general ledger and Teams (S43, S35, S36). Nothing is
 * connected in the demo; each page says so first. Routes are
 * `#/setup/erp/<page>`. NEEDS NATIVE REVIEW: Arabic labels are English.
 */
export const AREAS: readonly Area[] = [
  area("setup.erp", "ERP connection", "erp",
    "S43 erp employee sync posting file cost centre accounts"),
  area("setup.gl", "General ledger", "gl",
    "S35 accounting ledger journal posting csv accounts"),
  area("setup.teams", "Chat messages", "teams",
    "S36 teams slack chat card decisions notify"),
];
