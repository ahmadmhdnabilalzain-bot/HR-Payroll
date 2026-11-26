import { money, text, type Explanation }
  from "../../components/explain/types";
import { sumExplain } from "../../components/explain/sum";
import type { ReferralRow } from "../../demo/data/referrals";

/** The working behind "Outstanding": each fee owed, added up. */
export function outstandingExplain(rows: readonly ReferralRow[])
  : Explanation {
  const owed = rows.filter((r) => r.stage === "payable");
  return sumExplain({ id: "referrals:outstanding",
    title: "Outstanding", subject: "Referral and agency ledger",
    summary: "Every bonus or fee whose hire has completed 90 days, " +
      "added up. Nothing has been paid or added to a pay run.",
    resultLabel: "Outstanding",
    parts: owed.map((r) => ({ text: `${r.candidateName}, ` +
      r.kindText.toLowerCase(), value: money(r.amount) })),
    inputs: [{ label: "Rule", value: text("Payable after 90 days"),
      from: "Demo terms" }],
    rules: [{ text: "A bonus or fee is owed once the hire has " +
      "completed 90 days from the joining date.", status: "convention",
    statusLabel: null, citation: "Our own working, as we apply it" }],
    scope: "UAE mainland demo terms" });
}
