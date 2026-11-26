import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { useToast } from "../../ui/Toast";

/** Used by the ask-HR button: the question goes into the requests slice
 * as a ticket, so HR answers in the thread and no email is sent. */
export function useAskHr() {
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  return (question: string): void => {
    const id = `tk-new-${String(state.nextReq)}`;
    const me = personFor(data, state.role);
    dispatch({ type: "req-new", draft: { kind: "ticket", employeeId: me,
      by: me, role: state.role, raisedOn: data.requests.asOf, values: {
        category: "Other", subject: "Policy question",
        text: question } } });
    toast.show("Question sent to HR. The reply comes in your requests.",
      () => dispatch({ type: "req-new-undo", id }));
  };
}

export const REQUESTS_HREF = hrefOf("me", "hr-requests");
