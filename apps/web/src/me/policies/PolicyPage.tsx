import { useEffect, useRef } from "react";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { ackKey } from "../../demo/policies-state";
import { personFor } from "../../demo/time-off";
import { useLocale } from "../../i18n/LocaleProvider";
import { NotFound } from "../../people/papers/Outside";
import { ROLE_WORD } from "../../people/papers/words";
import { dayText } from "../../people/words";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { PageHead } from "../../ui/templates";
import s from "../../people/requests/requests.module.css";
import tpl from "../../ui/templates/templates.module.css";
import { Footnote } from "../../components/explain";
import { Note } from "./Answer";
import p from "./policies.module.css";

const HOME = hrefOf("me", "policies");

/** One policy: its owner, version, sections and the acknowledgement. */
export function PolicyPage(props: { id: string; section: string | null }) {
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const cited = useRef<HTMLLIElement | null>(null);
  const pol = data.policies.byId(props.id);
  const me = personFor(data, state.role);
  useEffect(() => {
    cited.current?.scrollIntoView({ block: "start" });
  }, [props.section]);
  if (pol === null) {
    return <NotFound what="policy" back="Policies" href={HOME} />;
  }
  const ack = state.policyAcks[ackKey(me, pol.id)];
  const current = ack?.version === pol.version ? ack : undefined;
  const name = (id: string): string =>
    data.people.person(id)?.name[lang] ?? id;
  const give = (): void => {
    dispatch({ type: "policy-ack", policyId: pol.id, ack: { by: me,
      role: state.role, on: data.policies.asOf, version: pol.version } });
    toast.show(`You acknowledged ${pol.title}, version ${pol.version}.`,
      () => dispatch({ type: "policy-unack", policyId: pol.id, by: me }));
  };
  return (
    <div className={tpl.page}>
      <PageHead title={pol.title} lede={pol.summary}
        back={{ label: "Policies", href: HOME }} />
      <div className={s.stack}>
        <dl className={p.meta}>
          <div><dt>Owner: </dt><dd>{pol.owner}</dd></div>
          <div><dt>Version: </dt><dd>{pol.version}</dd></div>
          <div><dt>Last reviewed: </dt>
            <dd>{dayText(pol.reviewed, lang)}</dd></div>
        </dl>
        <div className={s.actions}>
          {current !== undefined ? (
            <>
              <span role="status">
                {`Acknowledged by ${name(current.by)}, ` +
                  `${ROLE_WORD[current.role]}, ${dayText(current.on, lang)}, ` +
                  `version ${current.version}.`}
              </span>
              <button type="button" className={`${b.btn} ${b.quiet}`}
                onClick={() => {
                  dispatch({ type: "policy-unack", policyId: pol.id,
                    by: me });
                  toast.show("Acknowledgement taken back.", give);
                }}>Take back</button>
            </>
          ) : (
            <button type="button" className={`${b.btn} ${b.primary}`}
              onClick={give}>Acknowledge</button>
          )}
        </div>
        <ol className={p.sections}>
          {pol.sections.map((x) => (
            <li key={x.id} id={x.id} className={p.section}
              data-cited={x.id === props.section}
              ref={x.id === props.section ? cited : null}>
              <h2>{`${x.number} ${x.heading}`}</h2>
              <p>{x.text}</p>
              {x.note === null ? null : <Note text={x.note} />}
            </li>
          ))}
        </ol>
      </div>
      <Footnote />
    </div>
  );
}
