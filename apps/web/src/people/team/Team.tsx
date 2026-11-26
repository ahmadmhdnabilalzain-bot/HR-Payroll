import type { ViewProps } from "../../views";
import { CostCentres } from "./CostCentres";
import { Outside, useAllowed } from "./common";
import { OrgChart } from "./OrgChart";
import { Overview } from "./Overview";
import { Positions } from "./Positions";
import { Sites } from "./Sites";

/**
 * `#/people/team/<screen>`: overview, org, positions, sites and
 * cost-centres. People's router hands over the path after "team".
 * HR and the General manager only; others see "outside your view".
 */
export function Team(p: ViewProps) {
  const allowed = useAllowed();
  if (!allowed) return <Outside />;
  switch (p.rest[0]) {
    case "org": return <OrgChart />;
    case "positions": return <Positions />;
    case "sites": return <Sites />;
    case "cost-centres": return <CostCentres />;
    default: return <Overview />;
  }
}
