import type { Area } from "../types";
import { CORE_AREAS } from "./core";
import { AREAS as COST } from "./cost";
import { AREAS as HOME_ME } from "./home-me";
import { AREAS as PAY } from "./pay";
import { AREAS as PEOPLE_MOVES } from "./people-moves";
import { AREAS as PEOPLE_PAPERS } from "./people-papers";
import { AREAS as PEOPLE_TALENT } from "./people-talent";
import { AREAS as PEOPLE_TEAM } from "./people-team";
import { AREAS as REPORTS } from "./reports";
import { AREAS as REQUESTS } from "./requests";
import { AREAS as SETUP_ACCESS } from "./setup-access";
import { AREAS as SETUP_RULES } from "./setup-rules";
import { AREAS as SETUP_STRUCTURE } from "./setup-structure";
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
  ...TIME,
  ...PAY,
  ...REPORTS,
  ...COST,
  ...SETUP_RULES,
  ...SETUP_ACCESS,
  ...SETUP_STRUCTURE,
  ...HOME_ME,
  ...REQUESTS,
];
