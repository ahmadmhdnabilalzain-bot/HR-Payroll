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

/** The English catalog; the Arabic one is typed from it. */
export const en = { common, errors, shell, home, people,
  timeoff, explain, payrun, reports, tpl, inbox };

export type EnCatalog = typeof en;
