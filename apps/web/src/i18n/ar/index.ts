// NEEDS NATIVE REVIEW: authored by Claude, not yet confirmed by a
// native speaker.
import type { EnCatalog } from "../en";
import type { ArOf } from "../types";
import { common } from "./common";
import { errors } from "./errors";
import { explain } from "./explain";
import { home } from "./home";
import { shell } from "./shell";

export const ar: ArOf<EnCatalog> = { common, errors, shell, home, explain };
