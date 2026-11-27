import { useState } from "react";
import { navigate } from "../../demo/route";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { examples, interpret } from "./interpret";
import { useAskContext } from "./useAsk";
import s from "./Ask.module.css";

/**
 * X34: type what you want to see; the words are matched to a report by
 * rules (no model) and that report opens with its filter set. When
 * nothing matches, the list of reports below stays the way in.
 */
export function AskBox(p: { autoFocus?: boolean;
  /** The page's own title already says "Ask for a report". */
  titled?: boolean }) {
  const ctx = useAskContext();
  const toast = useToast();
  const [text, setText] = useState("");
  const [miss, setMiss] = useState(false);
  const go = (q: string): void => {
    const a = interpret(q, ctx);
    if (a.kind === "none") {
      setMiss(true);
      return;
    }
    setMiss(false);
    toast.show(`Opened ${a.target.label}${a.filterText === ""
      ? "" : `, ${a.filterText}`}.${a.note === "" ? "" : ` ${a.note}`}`);
    navigate("reports", ...a.rest);
  };
  return (
    <section className={s.box} aria-labelledby="ask-report-title">
      <h2 id="ask-report-title" className={p.titled === true
        ? "visually-hidden" : s.title}>Ask for a report</h2>
      <form className={s.form} onSubmit={(e) => {
        e.preventDefault();
        go(text);
      }}>
        <input id="ask-report-input" className={s.input} type="text"
          value={text} autoFocus={p.autoFocus === true}
          autoComplete="off" enterKeyHint="go"
          aria-label="Say which report you want"
          aria-describedby="ask-report-note"
          placeholder="For example: variance for September"
          onChange={(e) => {
            setText(e.target.value);
            setMiss(false);
          }} />
        <button type="submit" className={[b.btn, b.secondary].join(" ")}>
          Show report
        </button>
      </form>
      <p id="ask-report-note" className={s.note}>
        Reports are found by matching your words to the list below. Nothing
        is written for you.
      </p>
      {miss && (
        <p className={s.miss} role="status">
          No report matched those words. Pick one from the list below.
        </p>
      )}
      <ul className={s.examples} aria-label="Examples">
        {examples(ctx).map((q) => (
          <li key={q}>
            <button type="button" className={s.example} onClick={() => {
              setText(q);
              go(q);
            }}>{q}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
