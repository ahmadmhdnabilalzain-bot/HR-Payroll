// NEEDS NATIVE REVIEW: authored by Claude, not yet confirmed by a
// native speaker.
import type { EnCatalog } from "../en";
import type { ArOf } from "../types";
import { common } from "./common";
import { errors } from "./errors";
import { explain } from "./explain";
import { home } from "./home";
import { inbox } from "./inbox";
import { payrun } from "./payrun";
import { people } from "./people";
import { reports } from "./reports";
import { shell } from "./shell";
import { timeoff } from "./timeoff";
import { tpl } from "./tpl";

export const ar: ArOf<EnCatalog> = { common, errors, shell, home,
  people, timeoff, explain, payrun, reports, tpl, inbox };
