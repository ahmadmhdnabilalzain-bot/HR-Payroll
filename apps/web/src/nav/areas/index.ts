import type { Area } from "../types";
import { CORE_AREAS } from "./core";
import { AREAS as COST } from "./cost";
import { AREAS as ERP } from "./erp";
import { AREAS as EXIT_FILES } from "./exit-files";
import { AREAS as HOME_ME } from "./home-me";
import { AREAS as PAY } from "./pay";
import { AREAS as PAYROLL_EXTRAS } from "./payroll-extras";
import { AREAS as PEOPLE_MOVES } from "./people-moves";
import { AREAS as PEOPLE_PAPERS } from "./people-papers";
import { AREAS as PEOPLE_SAFETY } from "./people-safety";
import { AREAS as PEOPLE_TALENT } from "./people-talent";
import { AREAS as PEOPLE_TEAM } from "./people-team";
import { AREAS as REPORTS } from "./reports";
import { AREAS as REQUESTS } from "./requests";
import { AREAS as SETUP_ACCESS } from "./setup-access";
import { AREAS as SETUP_RULES } from "./setup-rules";
import { AREAS as SETUP_STRUCTURE } from "./setup-structure";
import { AREAS as SWEEP_PAY } from "./sweep-pay";
import { AREAS as SWEEP_PEOPLE } from "./sweep-people";
import { AREAS as TIME } from "./time";

/**
 * Every area, from a fixed list of files: WP1's core plus one file per
 * area package (WP2 to WP10). A package edits only its own file.
 */
export const ALL_AREAS: readonly Area[] = [
  ...CORE_AREAS,
  ...PEOPLE_TEAM,
  ...PEOPLE_MOVES,
  ...PEOPLE_PAPERS,
  ...PEOPLE_TALENT,
  ...PEOPLE_SAFETY,
  ...TIME,
  ...PAY,
  ...PAYROLL_EXTRAS,
  ...REPORTS,
  ...COST,
  ...SETUP_RULES,
  ...SETUP_ACCESS,
  ...SETUP_STRUCTURE,
  ...SWEEP_PAY,
  ...HOME_ME,
  ...REQUESTS,
  ...EXIT_FILES,
  ...SWEEP_PEOPLE,
  ...ERP,
];
