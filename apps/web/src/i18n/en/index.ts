import { common } from "./common";
import { errors } from "./errors";
import { explain } from "./explain";
import { home } from "./home";
import { payrun } from "./payrun";
import { shell } from "./shell";

/** The English catalog; the Arabic one is typed from it. */
export const en = { common, errors, shell, home, explain, payrun };

export type EnCatalog = typeof en;
