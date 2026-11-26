import { common } from "./common";
import { errors } from "./errors";
import { explain } from "./explain";
import { home } from "./home";
import { people } from "./people";
import { shell } from "./shell";
import { timeoff } from "./timeoff";

/** The English catalog; the Arabic one is typed from it. */
export const en = { common, errors, shell, home, people,
  timeoff, explain };

export type EnCatalog = typeof en;
