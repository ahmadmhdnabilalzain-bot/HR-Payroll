import { useState } from "react";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { dayText } from "../../people/words";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { PageHead } from "../../ui/templates";
import s from "../../people/requests/requests.module.css";
import tpl from "../../ui/templates/templates.module.css";
import { Footnote } from "../../components/explain";
import { ackKey } from "../../demo/policies-state";
import { Answer } from "./Answer";
import { PolicyPage } from "./PolicyPage";
import p from "./policies.module.css";

/** `#/me/policies[/<policy>[/<section>]]`: the library and the asking. */
export function Policies(props: { rest: string[] }) {
  const [id, section] = props.rest;
  return id === undefined ? <Library /> : (
    <PolicyPage id={id} section={section ?? null} />);
}

/** H15: ask about a policy, then the library below. */
function Library() {
  const { data, state } = useDemo();
  const { lang } = useLocale();
  const [text, setText] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const me = personFor(data, state.role);
  const lib = data.policies.library();
  const run = (e: React.FormEvent): void => {
    e.preventDefault();
    setAsked(text.trim() === "" ? null : text.trim());
  };
  return (
    <div className={tpl.page}>
      <PageHead title="Policy answers"
        lede={"Type a question. The answer quotes our written policy and " +
          "says which section it came from."} />
      <div className={s.stack}>
        <form className={p.ask} onSubmit={run} role="search">
          <label className={s.field}>
            <span>Your question</span>
            <input type="search" className={s.search} value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="For example: how do I report sick?" />
          </label>
          <button type="submit" className={`${b.btn} ${b.primary}`}>
            Find in policies</button>
        </form>
        <p className={s.muted}>{data.policies.note}</p>
        {asked === null ? null : (
          <Answer question={asked} key={asked} />)}
        <section aria-labelledby="lib" className={s.stack}>
          <h2 id="lib" style={{ margin: 0 }}>All policies</h2>
          <ul className={p.list}>
            {lib.map((x) => {
              const ack = state.policyAcks[ackKey(me, x.id)];
              const done = ack?.version === x.version;
              return (
                <li key={x.id} className={p.row}>
                  <div>
                    <a href={hrefOf("me", "policies", x.id)}>{x.title}</a>
                    <p className={s.small}>
                      {`${x.summary} Version ${x.version}, reviewed ` +
                        `${dayText(x.reviewed, lang)}.`}
                    </p>
                  </div>
                  <span className={s.small}>{done ? "Acknowledged"
                    : "Not acknowledged"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <Footnote />
    </div>
  );
}
