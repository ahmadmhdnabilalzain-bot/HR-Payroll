import { common } from "./common";
import { errors } from "./errors";

/** The English catalog; the Arabic one is typed from it. */
export const en = { common, errors };

export type EnCatalog = typeof en;
