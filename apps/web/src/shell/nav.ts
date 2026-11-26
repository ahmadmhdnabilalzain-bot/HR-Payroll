import type { Section } from "../demo/state";
import type { MessageKey } from "../i18n/t";
import type { IconName } from "../ui/Icon";

/**
 * Every section in order; the bar, the phone bar and search show only
 * those with a view (src/views.tsx). Reports is not in the phone bar
 * (at most four there, plus search).
 */
export const NAV_ITEMS: [Section, MessageKey, IconName][] = [
  ["home", "shell.navHome", "home"],
  ["pay-run", "shell.navPayRun", "wallet"],
  ["people", "shell.navPeople", "users"],
  ["time-off", "shell.navTimeOff", "calendar"],
  ["reports", "shell.navReports", "chart"],
];
