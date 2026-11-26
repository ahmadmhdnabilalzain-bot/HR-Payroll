import { CHANNEL_EXAMPLES } from "./examples-channels";
import { HR_EXAMPLES } from "./examples-hr";
import { EXPENSE_EXAMPLES } from "./examples-expenses";
import { PAY_EXAMPLES } from "./examples-pay";
import { PEOPLE_EXAMPLES } from "./examples-people";

export {
  IBAN_SENTINEL,
  IDS as EXAMPLE_IDS,
  SALARY_SENTINEL,
} from "./examples-people";

/** One valid example per response schema, keyed by schema name. */
export const EXAMPLES: Readonly<Record<string, unknown>> = {
  ...PEOPLE_EXAMPLES,
  ...PAY_EXAMPLES,
  ...HR_EXAMPLES,
  ...EXPENSE_EXAMPLES,
  ...CHANNEL_EXAMPLES,
};
