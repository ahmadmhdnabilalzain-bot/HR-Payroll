import { EngineError } from "./errors";
import { deepFreeze } from "./freeze";
import type { RuleSource } from "./rules/types";

const LAW_URL = "https://uaelegislation.gov.ae/en/legislations/1541";

const UAE_GOV_BASE = "https://u.ae/en/information-and-services/jobs/" +
  "Sector-of-employment/employment-in-the-private-sector/";

const LEG = "https://uaelegislation.gov.ae/en/legislations/";
const DL33 = "Federal Decree-Law 33 of 2021, ";
const ER1 = "Cabinet Resolution 1 of 2022 (Executive Regulation), ";
const DL57 = "Federal Decree-Law 57 of 2023, ";
const L7 = "Federal Law 7 of 1999, ";
const L7_CAVEAT = " (site English text; later amendments not read)";

/** One source per article, so a param names the clause it reads. */
const ARTICLES: Record<string, RuleSource> = {
  DL33_ART1: { url: LAW_URL, note: DL33 + "Article 1 (definitions)" },
  DL33_ART17: { url: LAW_URL, note: DL33 + "Article 17(1)" },
  DL33_ART19: { url: LAW_URL, note: DL33 + "Article 19(1)-(4)" },
  DL33_ART25: { url: LAW_URL, note: DL33 + "Article 25(1)-(2)" },
  DL33_ART28: { url: LAW_URL, note: DL33 + "Article 28(2)" },
  DL33_ART30: { url: LAW_URL, note: DL33 + "Article 30(1)-(2)" },
  DL33_ART31: { url: LAW_URL, note: DL33 + "Article 31(2)-(3)" },
  DL33_ART39: { url: LAW_URL, note: DL33 + "Article 39(1)(c)" },
  DL33_ART9: { url: LAW_URL, note: DL33 + "Article 9(1)-(6)" },
  DL33_ART43: { url: LAW_URL, note: DL33 + "Article 43(1)-(5)" },
  DL33_ART44: { url: LAW_URL, note: DL33 +
    "Article 44 (heading and list read; body not read closely)" },
  DL33_ART45: { url: LAW_URL, note: DL33 + "Article 45 (list read)" },
  DL33_ART53: { url: LAW_URL, note: DL33 + "Article 53" },
  ER1_2022_ART19: { url: LEG + "1547", note: ER1 + "Article 19(1)" },
  DL57_ART4: { url: LEG + "2254", note: DL57 + "Article 4(1)" },
  DL57_ART5: { url: LEG + "2254", note: DL57 + "Article 5(2)" },
  DL57_ART10: { url: LEG + "2254", note: DL57 + "Article 10(2)" },
  DL57_ART11: { url: LEG + "2254", note: DL57 + "Article 11(3)" },
  L7_ART1: { url: LEG + "1111", note: L7 + "Article 1(d)" + L7_CAVEAT },
  L7_ART2: { url: LEG + "1111", note: L7 + "Article 2" + L7_CAVEAT },
  L7_ART10: { url: LEG + "1111", note: L7 + "Article 10" + L7_CAVEAT },
};

/** Frozen: callers cannot change a source that every pack shares. */
export const SOURCES: Record<string, RuleSource> = deepFreeze({
  ...ARTICLES,
  LAW_33_2021: {
    url: LAW_URL,
    note: "Federal Decree-Law 33 of 2021, Articles 29 and 51",
  },
  UAE_GOV_EOSB: {
    url: UAE_GOV_BASE + "end-of-service-benefits-for-employees-in-" +
      "the-private-sector",
    note: "u.ae end-of-service gratuity page",
  },
  UAE_GOV_LEAVES: {
    url: UAE_GOV_BASE + "Types-of-leaves",
    note: "u.ae types-of-leaves page",
  },
  ARABIAN_BUSINESS_EOSB: {
    url: "https://www.arabianbusiness.com/business/" +
      "uae-gratuity-rules-how-to-calculate-end-of-service-pay",
    note: "Secondary press summary of a MOHRE post",
  },
  X0PA_EOSB_CALC: {
    url: "https://x0pa.com/calculators/end-of-service-gratuity/",
    note: "Secondary vendor calculator",
  },
  ENGINE_CONVENTION: {
    url: "",
    note: "engine convention, not law",
  },
  HYPOTHETICAL: {
    url: "",
    note: "hypothetical change, not law",
  },
});

export function sourceOf(id: string): RuleSource {
  const source = Object.hasOwn(SOURCES, id) ? SOURCES[id] : undefined;
  if (source === undefined) {
    throw new EngineError("UNKNOWN_SOURCE", `Unknown source id: ${id}`, {
      id,
    });
  }
  return source;
}
