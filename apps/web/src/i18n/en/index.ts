import { common } from "./common";
import { errors } from "./errors";
import { home } from "./home";
import { shell } from "./shell";

/** The English catalog; the Arabic one is typed from it. */
export const en = { common, errors, shell, home };

export type EnCatalog = typeof en;
