import { useMoney } from "../fmt";

/** Money as table text that never breaks between "AED" and the digits. */
export function useTableMoney(): (f: Parameters<ReturnType<
  typeof useMoney>["m"]>[0]) => string {
  const { m } = useMoney();
  return (f) => m(f).replace(" ", " ");
}
