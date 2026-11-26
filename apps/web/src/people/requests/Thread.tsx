import { useState } from "react";
import b from "../../ui/button.module.css";
import type { TicketRow } from "./model";
import s from "./requests.module.css";
import type { Requests } from "./useRequests";

/** The messages on a ticket, oldest first, and the reply box. */
export function Thread(p: { t: TicketRow; r: Requests;
  as: "employee" | "hr" }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { t, r } = p;
  const send = (): void => {
    if (text.trim() === "") {
      setError("Write a line first.");
      return;
    }
    const id = `rp-${String(r.state.nextReq)}`;
    r.dispatch({ type: "req-reply", draft: { ticketId: t.id, from: p.as,
      byId: r.me, role: r.state.role, on: r.data.requests.asOf,
      text: text.trim() } });
    r.toast.show("Reply sent.", () =>
      r.dispatch({ type: "req-reply-undo", id }));
    setText("");
    setError(null);
  };
  const reopen = (): void => r.record(t.id, "open", "Ticket reopened.",
    t.step);
  return (
    <div className={s.block}>
      <ol className={s.thread} aria-label="Messages">
        {t.thread.map((m) => (
          <li key={m.id} className={s.msg} data-from={m.from}>
            <div className={s.msgHead}>
              <strong>{r.nameOf(m.byId)}</strong>
              <span>{m.from === "hr" ? "HR" : r.roleOf(m.byId)}
                {", "}{r.when(m.on)}</span>
            </div>
            <p>{m.text}</p>
          </li>
        ))}
      </ol>
      {t.status === "solved" ? (
        <div className={s.actions}>
          <p className={s.small}>
            This ticket is solved. Reopen it to write again.</p>
          <button type="button" className={`${b.btn} ${b.secondary}`}
            onClick={reopen}>Reopen</button>
        </div>
      ) : (
        <div className={s.reply}>
          <label className={s.field}>
            <span>{p.as === "hr" ? "Your reply" : "Add a message"}</span>
            <textarea rows={3} value={text} onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }} />
          </label>
          {error !== null && <p role="alert" className={s.small}>{error}</p>}
          <div className={s.actions}>
            <button type="button" className={`${b.btn} ${b.primary}`}
              onClick={send}>Send reply</button>
          </div>
        </div>
      )}
    </div>
  );
}
