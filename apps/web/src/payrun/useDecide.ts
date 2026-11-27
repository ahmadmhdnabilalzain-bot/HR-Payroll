import { useRunApproval } from "../demo/actions";
import { runApprovalId } from "../demo/derive";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { useToast } from "../ui/Toast";
import { forgetDecision, recordDecision } from "./model";

/**
 * The checker's decision on the run, from the header or the card: it
 * is recorded at once and confirmed in a toast whose Undo takes it
 * back (as the Undo under the stamp does). The only two places to
 * undo it.
 */
export function useDecide(): {
  decide(v: "approve" | "decline"): void;
  undo(): void;
} {
  const { t } = useLocale();
  const { data, dispatch } = useDemo();
  const a = useRunApproval();
  const toast = useToast();
  const id = runApprovalId(data);
  const undo = (): void => {
    if (id === null) return;
    forgetDecision(id);
    dispatch({ type: "undecide", id });
  };
  return {
    decide: (v) => {
      if (id === null) return;
      recordDecision(id);
      a.decide(v);
      toast.show(t(v === "approve" ? "payrun.signedToast"
        : "payrun.sentBackToast"), undo);
    },
    undo,
  };
}
