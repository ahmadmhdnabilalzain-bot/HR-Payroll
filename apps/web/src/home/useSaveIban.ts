import { useDemo } from "../demo/state";
import { formatMoney } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { useToast } from "../ui/Toast";

/**
 * Saves an IBAN the check passed, with the toast that says what the
 * salary file now holds and offers undo. One path for the issue row
 * and the top card, so both say the same.
 */
export function useSaveIban(): (employeeId: string, value: string) => void {
  const { lang, t } = useLocale();
  const { source, data, state, dispatch } = useDemo();
  const toast = useToast();
  return (id, value) => {
    const name = data.employee(id).name[lang];
    const next = source.at({ ...state.ibans, [id]: value }).headline();
    dispatch({ type: "iban", employeeId: id, value });
    toast.show(t("home.doneIban", { name, count: next.sifPeople,
      amount: formatMoney(next.sifTotalFils, lang) }),
    () => dispatch({ type: "unset-iban", employeeId: id }));
  };
}
