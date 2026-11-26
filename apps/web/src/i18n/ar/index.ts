// NEEDS NATIVE REVIEW: authored by Claude, not yet confirmed by a
// native speaker.
import type { EnCatalog } from "../en";
import type { ArOf } from "../types";
import { common } from "./common";
import { errors } from "./errors";
import { home } from "./home";
import { explain } from "./explain";
import { people } from "./people";
import { shell } from "./shell";
import { timeoff } from "./timeoff";

export const ar: ArOf<EnCatalog> = { common, errors, shell, home, people,
  timeoff, explain };
