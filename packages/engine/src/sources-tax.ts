import type { RuleSource } from "./rules/types";

/**
 * VAT, corporate tax and e-invoicing sources, as printed in
 * docs/research/2026-11-26-vat-einvoicing-primary.md (section in each
 * comment). URLs are the note's text joined with no spaces; where the
 * note gives none, the url is the FTA home page and the note says so.
 */
const FTA = "https://tax.gov.ae";
const MOF_UP = "https://mof.gov.ae/wp-content/uploads/";

// Section 1.
const GUIDE_URL = FTA + "/DataFolder/Files/Pdf/VAT%20Returns%20User%20Guide" +
  "EnglishV40%2015%2008%202021%20SEP2021.pdf";

// Section 2.
const DEC17_URL = FTA + "//Datafolder/Files/Pdf/2026/legislation/FTA%" +
  "20Decision%20No.%2017%20of%202026%20on%20the%20Cases%20and%20" +
  "Conditions%20for%20the%20Recovery%20of%20Input%20Tax%20Incurred%20" +
  "on%20Employee%20Expenses%20-%20Publishing.pdf";

// Section 3.1.
const MD243_URL = FTA + "/Datafolder/Files/Pdf/2026/e-invoicing/" +
  "Ministerial-Decision-no.-243-of-2025-on-the-Electronic-Invoicing-" +
  "System.pdf";
const MD244_URL = FTA + "/datafolder/Files/Legislation/2025/" +
  "Ministerial%20Decision%20No.%20244%20of%202025%20on%20The%20" +
  "Implementation%20of%20The%20Electronic%20Invoicing%20System.pdf";
const MD66_URL = MOF_UP + "2026/05/Ministerial-Resolution-No.-66-of-" +
  "2026-Amending-Certain-Provisions-of-Ministerial-Resolution-No.-244-" +
  "of-2025-Regarding-the-Implementation-of-the-Electronic-Invoicing-" +
  "System-En-20260514.pdf";
const MD197_URL = MOF_UP + "2026/10/Ministerial-Decision-No.-197-of-" +
  "2026-%E2%80%93-Amending-Certain-Provisions-of-Ministerial-Decision-" +
  "No.-243-of-2025-on-the-Electronic-Invoicing-System_En.pdf";
const FAQ_URL = FTA + "/en/content/uae.einvoicing.aspx";
const GUIDELINES_URL = MOF_UP + "2026/06/UAE-Electronic-Invoicing-" +
  "Guidelines_V-1.1-01June2026.pdf";

// Section 3.6.
const CD106_URL = FTA + "/datafolder/Files/Legislation/2025/" +
  "Cabinet%20Decision%20No.%20106%20of%202025.pdf";

// Section 4.
const CT_BULLETIN_URL = FTA +
  "/datafolder/Files/Pdf/2026/CT_TaxB_ulletin_EN_V5.pdf";

const DEC17 = "FTA Decision 17 of 2026, ";
const UNOFFICIAL = " (unofficial translation)";
const MD244 = "Ministerial Decision 244 of 2025, ";

function dec17Case(n: number): RuleSource {
  return { url: DEC17_URL, note: `${DEC17}Article 2, case ${n}` +
    UNOFFICIAL };
}

export const TAX_SOURCES: Record<string, RuleSource> = {
  FTA_VAT_GUIDE21: { url: GUIDE_URL,
    note: "FTA VAT Returns User Guide V4.0, August 2021; possibly " +
      "outdated" },
  FTA_DEC17_2026_ART1: { url: DEC17_URL,
    note: DEC17 + "Article 1" + UNOFFICIAL },
  FTA_DEC17_2026_ART2_1: dec17Case(1),
  FTA_DEC17_2026_ART2_2: dec17Case(2),
  FTA_DEC17_2026_ART2_3: dec17Case(3),
  FTA_DEC17_2026_ART2_4: dec17Case(4),
  FTA_DEC17_2026_ART2_5: dec17Case(5),
  FTA_DEC17_2026_ART2_6: dec17Case(6),
  MD243_2025: { url: MD243_URL, note: "Ministerial Decision 243 of 2025" },
  MD244_2025_ART5: { url: MD244_URL, note: MD244 + "Article 5" },
  // Section 3.3 prints no URL; the MD 244 PDF of section 3.1 is used.
  MD244_2025_ART3_4: { url: MD244_URL,
    note: MD244 + "Articles 3 and 4 (pilot and voluntary start)" },
  MD66_2026: { url: MD66_URL, note: "MD 66 of 2026; MoF copy unsigned" },
  MD197_2026: { url: MD197_URL, note: "MD 197 of 2026; MoF copy unsigned" },
  FTA_NEWS_2026_10_25: { url: FTA,
    note: "FTA news 25 Oct 2026; exact page URL not recorded" },
  FTA_EINV_FAQ: { url: FAQ_URL,
    note: "FTA e-invoicing page and FAQ, updated 17 Nov 2026" },
  MOF_EINV_GUIDELINES: { url: GUIDELINES_URL,
    note: "MoF E-invoicing Guidelines V2.1, glossary only (V1.1 path; " +
      "link serves V2.1)" },
  CD106_2025: { url: CD106_URL,
    note: "Cabinet Decision 106 of 2025, table rows 1 to 3 (search " +
      "extract)" },
  FTA_CT_SB_BULLETIN: { url: CT_BULLETIN_URL,
    note: "FTA Basic Tax Information Bulletin: Small Business (snippet)" },
  // The bulletin snippet (section 4) cut off the 0% word; only the
  // 25 Nov note, itself snippet level with no URL, shows the figure.
  RESEARCH_CT_ZERO_RATE: { url: "",
    note: "docs/research/2026-11-25-vat-corporate-tax-einvoicing.md, " +
      "corporate tax: \"0% on taxable income up to AED 375,000\" " +
      "(snippet level; the 0% word was cut off in the FTA bulletin " +
      "snippet)" },
  FTA_CT_SBR_TOPIC: { url: FTA,
    note: "FTA corporate tax topics page (extract); exact page URL not " +
      "recorded" },
  FTA_CT_FILING_NEWS: { url: FTA,
    note: "FTA news 24 Sep 2025 (extract); exact page URL not recorded" },
};
