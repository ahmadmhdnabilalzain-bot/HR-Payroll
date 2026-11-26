import { useDemo } from "../../demo/state";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { FilterList } from "../../ui/templates";
import type { AccessData } from "./data";
import { Status, stampText, useActor } from "./ui";
import s from "./access.module.css";

/** S24: check each person's access, then sign the review off. */
export function Review(p: { d: AccessData }) {
  const { d } = p;
  const { state, dispatch } = useDemo();
  const actor = useActor();
  const toast = useToast();
  const kept = (id: string): boolean => state.accessKept[id] !== undefined;
  const todo = d.users.filter((u) => !kept(u.id));
  const signed = state.accessSignoff;
  const keep = (ids: string[], text: string): void => {
    dispatch({ type: "access-keep", ids, stamp: actor.stamp() });
    toast.show(text, () => dispatch({ type: "access-unkeep", ids }));
  };
  const signOff = (): void => {
    dispatch({ type: "access-signoff", stamp: actor.stamp() });
    toast.show("Review signed off.",
      () => dispatch({ type: "access-unsign" }));
  };
  const lede = signed !== null
    ? `Signed off by ${stampText(signed)}. Last time: ${d.review.text}`
    : `Look at each person's role, then sign off${actor.isGm ? "" :
      " (the General manager signs off)"}. ${d.review.text}`;
  return (
    <FilterList title="Access review" lede={lede} rows={d.users}
      rowKey={(u) => u.id} searchText={(u) => `${u.name} ${u.rolesText}`}
      segments={[{ id: "todo", label: "To check", match: (u) => !kept(u.id) },
        { id: "done", label: "Kept", match: (u) => kept(u.id) }]}
      actions={signed !== null ? (
        <button type="button" className={`${b.btn} ${b.secondary} ${s.tap}`}
          onClick={() => dispatch({ type: "access-unsign" })}>
          Reopen the review</button>
      ) : (
        <>
          {todo.length > 0 && (
            <button type="button" className={`${b.btn} ${b.secondary} ${s.tap}`}
              onClick={() => keep(todo.map((u) => u.id),
                `Kept access for ${todo.length} people.`)}>
              Keep everyone's access</button>
          )}
          <button type="button" className={`${b.btn} ${b.primary} ${s.tap}`}
            disabled={todo.length > 0 || !actor.isGm}
            title={actor.isGm ? undefined
              : "Only the General manager signs off the review."}
            onClick={signOff}>Sign off the review</button>
        </>
      )}
      columns={[{ key: "n", label: "Person", render: (u) => u.name },
        { key: "r", label: "Role", render: (u) => u.rolesText },
        { key: "l", label: "Last sign-in", render: (u) => u.lastSignInText },
        { key: "k", label: "Decision", end: true, render: (u) => {
          const k = state.accessKept[u.id];
          return k === undefined ? (
            <button type="button" className={`${b.btn} ${b.secondary} ${s.tap}`}
              onClick={() => keep([u.id], `Kept access for ${u.name}.`)}>
              Keep access</button>
          ) : (
            <span className={s.itemEnd}>
              <Status tone="ok">Kept by {k.by}, {k.on}</Status>
              <button type="button" className={`${b.btn} ${b.quiet} ${s.tap}`}
                onClick={() => dispatch({ type: "access-unkeep",
                  ids: [u.id] })}>Undo</button>
            </span>
          );
        } }]}
      empty={todo.length === 0
        ? "Everyone's access is kept. Sign off the review."
        : "No one here."} />
  );
}
