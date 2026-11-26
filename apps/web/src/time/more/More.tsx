import type { ViewProps } from "../../views";
import { Outside } from "../../people/team/common";
import { Cover } from "./Cover";
import { Kiosk, Phone } from "./Clock";
import { Corrections } from "./Corrections";
import { Encash } from "./Encash";
import { LeaveFor } from "./LeaveFor";
import { Liability, Wfh } from "./Reports";

/**
 * `#/time-off/more/<screen>`: record leave for someone (T03), leave
 * encashment (T05), leave liability (T06), attendance corrections
 * (T11), phone clock-in (T12), work from home (T15), kiosk check-in
 * (T16) and the leave-safe roster (T23). Who may open each is the
 * registry's `roles` (the shell's route guard).
 */
export function More(p: ViewProps) {
  const [, screen, ...rest] = p.rest;
  switch (screen) {
    case "leave-for": return <LeaveFor />;
    case "encash": return <Encash rest={rest} />;
    case "liability": return <Liability />;
    case "corrections": return <Corrections />;
    case "phone": return <Phone />;
    case "wfh": return <Wfh />;
    case "kiosk": return <Kiosk />;
    case "cover": return <Cover />;
    default: return <Outside />;
  }
}
