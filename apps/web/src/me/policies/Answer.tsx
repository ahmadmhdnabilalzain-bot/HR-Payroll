import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import b from "../../ui/button.module.css";
import s from "../../people/requests/requests.module.css";
import { useAskHr, REQUESTS_HREF } from "./ask";
import p from "./policies.module.css";

/** The answer to one question: the quoted text and where it is from. */
export function Answer(props: { question: string }) {
  const { data } = useDemo();
  const ask = useAskHr();
  const a = data.policies.ask(props.question);
  const [top, ...more] = a.hits;
  return (
    <section className={p.answer} aria-live="polite"
      aria-label="Answer">
      {top === undefined ? (
        <>
          <h2 style={{ margin: 0 }}>{data.policies.notCovered}</h2>
          <p className={s.muted}>
            {"We could not find this in our written policies. HR can " +
              "answer it, in a thread you can open later."}
          </p>
        </>
      ) : (
        <>
          <blockquote className={p.quote}>{top.quote}</blockquote>
          <a className={p.cite} href={hrefOf("me", "policies", top.policyId,
            top.sectionId)}>{top.citation}</a>
          {top.note === null ? null : <Note text={top.note} />}
          {more.length === 0 ? null : (
            <div>
              <p className={s.small}>Also see</p>
              <ul className={p.also}>
                {more.map((h) => (
                  <li key={h.sectionId}>
                    <a className={s.link} href={hrefOf("me", "policies",
                      h.policyId, h.sectionId)}>{h.citation}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <div className={s.actions}>
        <button type="button" className={`${b.btn} ${b.secondary}`}
          onClick={() => ask(props.question)}>Ask HR</button>
        <a className={s.link} href={REQUESTS_HREF}>My requests</a>
      </div>
    </section>
  );
}

/** A statutory point, worded "as we read it", behind a disclosure. */
export function Note(props: { text: string }) {
  return (
    <details className={p.note}>
      <summary>How we read the law here</summary>
      <p>{props.text}</p>
    </details>
  );
}
