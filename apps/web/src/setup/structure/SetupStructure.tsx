import { hrefOf, navigate } from "../../demo/route";
import type { ViewProps } from "../../views";
import { ChecklistRecord, ChecklistsList } from "./Checklists";
import { Devices } from "./Devices";
import { Documents } from "./Documents";
import { Exclusions } from "./Exclusions";
import { Holidays } from "./Holidays";
import { Jobs } from "./Jobs";
import { Kpis } from "./Kpis";
import { LetterRecord, LettersList } from "./Letters";
import { SignOff } from "./SignOff";
import { Loading, NotFound } from "./ui";
import { useStructure } from "./useStructure";

/**
 * The Setup structure screens (WP11): jobs, documents, letters,
 * checklists, sign-off levels, KPIs, exemptions, devices, holidays.
 * Routes: `#/setup/structure/<page>/<id>/<tab>`.
 */
export function SetupStructure(p: ViewProps) {
  const d = useStructure();
  const [, page = "", id, tab = ""] = p.rest;
  if (d === null) return <Loading />;
  const onTab = (t: string): void => navigate("setup", "structure", page,
    id ?? "", t);
  switch (page) {
    case "jobs": return <Jobs d={d} />;
    case "documents": return <Documents d={d} />;
    case "letters":
      return id === undefined ? <LettersList d={d} />
        : <LetterRecord d={d} id={id} tab={tab} onTab={onTab} />;
    case "checklists":
      return id === undefined ? <ChecklistsList d={d} />
        : <ChecklistRecord d={d} id={id} />;
    case "sign-off": return <SignOff d={d} />;
    case "kpis": return <Kpis d={d} />;
    case "exemptions": return <Exclusions d={d} />;
    case "devices": return <Devices d={d} />;
    case "holidays": return <Holidays d={d} />;
    default: return <NotFound label="Setup" back={hrefOf("s", "setup")} />;
  }
}
