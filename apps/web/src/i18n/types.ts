export type Lang = "en" | "ar";

export interface EnPlural {
  one: string;
  other: string;
}

export interface ArPlural {
  zero: string;
  one: string;
  two: string;
  few: string;
  many: string;
  other: string;
}

/** One namespace of the English catalog. */
export type EnNamespace = Record<string, string | EnPlural>;

/**
 * The Arabic catalog's type comes from the English one: same keys,
 * plural values take Arabic's six forms. A missing key fails typecheck.
 */
export type ArOf<T> = {
  [K in keyof T]: T[K] extends string ? string
    : T[K] extends EnPlural ? ArPlural
      : ArOf<T[K]>;
};
