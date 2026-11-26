import { useState, type FormEvent } from "react";
import { useDemo } from "../../demo/state";
import b from "../../ui/button.module.css";
import { PageHead } from "../../ui/templates";
import { codeRows } from "./model";
import v from "./verify.module.css";
import { V } from "./words";

/**
 * P34, the check page. Anyone may open it: they type the code from a
 * letter and read who issued it, when and for whom. The answer is worked
 * out from the letters issued in this demo and shows no pay figure.
 */
export function Check() {
  const { data, state } = useDemo();
  const [text, setText] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const rows = codeRows(data, state);
  const result = asked === null ? null : data.verify.lookup(rows, asked);
  const found = result !== null && result.found ? result.letter : null;
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    setAsked(text);
  };
  return (
    <div className={v.page}>
      <PageHead title={V.checkTitle} lede={V.checkLede} />
      <section className={v.panel} aria-label={V.checkTitle}>
        <form className={v.checkForm} onSubmit={submit} noValidate>
          <label>
            <span>{V.codeLabel}</span>
            <input value={text} autoComplete="off" spellCheck={false}
              onChange={(e) => setText(e.target.value)} />
            <small>{V.codeHelp}</small>
          </label>
          <button type="submit" className={`${b.btn} ${b.primary} ${
            b.large}`}>{V.checkButton}</button>
        </form>
        <div role="status" aria-live="polite">
          {asked !== null && asked.trim() === "" && (
            <p className={v.note}>{V.checkEmpty}</p>)}
          {asked !== null && asked.trim() !== "" && found === null && (
            <div className={v.result}>
              <h2>{V.notFoundTitle}</h2>
              <p>{V.notFoundBody}</p>
            </div>)}
          {found !== null && (
            <div className={v.result}>
              <h2>{found.status === "valid" ? V.validTitle
                : V.withdrawnTitle}</h2>
              <p>{found.statement}</p>
            </div>)}
        </div>
        <p className={v.note}>{data.verify.note}</p>
      </section>
    </div>
  );
}
