import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PayslipView } from "../../demo/data/people-types";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { formatMoney, formatMonth } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { amountsHidden, MONEY_MASK } from "../../ui/mask";
import { Money } from "../../ui/Money";
import { Sheet } from "../../ui/templates/Sheet";
import { useToast } from "../../ui/Toast";
import { aboutLine, askHrDraft, lineQuestions, type LineRef, type Part,
  type Sentence } from "./line";
import s from "./AskLine.module.css";

type Open = (line: LineRef) => void;
const AskContext = createContext<Open | null>(null);

/** Gives a payslip's lines the "About this line" sheet (E16): only to
 * the person the payslip belongs to. */
export function AskProvider(p: { slip: PayslipView;
  children: ReactNode }) {
  const { data, state } = useDemo();
  const [line, setLine] = useState<LineRef | null>(null);
  const mine = state.role === "employee" &&
    p.slip.employeeId === personFor(data, state.role);
  return (
    <AskContext.Provider value={mine ? setLine : null}>
      {p.children}
      {mine && (
        <Sheet open={line !== null} title="About this line"
          onClose={() => setLine(null)}>
          {line !== null && <About slip={p.slip} line={line}
            onClose={() => setLine(null)} />}
        </Sheet>
      )}
    </AskContext.Provider>
  );
}

/** A line's name: a button that opens the sheet, or plain words. */
export function AskName(p: { line: LineRef }) {
  const open = useContext(AskContext);
  if (open === null) return <>{p.line.label}</>;
  return (
    <button type="button" className={s.name}
      aria-label={`About this line: ${p.line.label}`}
      onClick={() => open(p.line)}>
      {p.line.label}
    </button>
  );
}

function Words(p: { sentence: Sentence }) {
  return (
    <>
      {p.sentence.map((x: Part, i) => typeof x === "string"
        ? <span key={i}>{x}</span>
        : <Money key={i} value={x.fils} size="sm" tween={false}
          {...(x.signed === true ? { signed: true } : {})} />)}
    </>
  );
}

function About(p: { slip: PayslipView; line: LineRef; onClose(): void }) {
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const monthName = (m: string): string => formatMonth(m, lang);
  const ex = data.people.explain(p.slip.id, p.line.traceId, p.line.label,
    lang);
  const body = useMemo(() => aboutLine(ex, p.line), [ex, p.line]);
  const questions = useMemo(() => lineQuestions(data, p.slip, p.line, ex,
    monthName), [data, p.slip, p.line, ex, lang]);
  const draft = askHrDraft(p.line, monthName(p.slip.month),
    formatMoney(p.line.amountFils, lang));
  // While amounts are hidden the box shows the mask; an untouched box
  // still sends the amount to HR.
  const shown = amountsHidden(state) ? askHrDraft(p.line,
    monthName(p.slip.month), MONEY_MASK).text : draft.text;
  const [text, setText] = useState(shown);
  const me = personFor(data, state.role);
  const send = (): void => {
    const id = `tk-new-${String(state.nextReq)}`;
    dispatch({ type: "req-new", draft: { kind: "ticket", employeeId: me,
      raisedOn: data.requests.asOf, by: me, role: state.role,
      values: { category: draft.category, subject: draft.subject,
        text: text.trim() === "" || text === shown ? draft.text
          : text.trim(),
        line: p.line.label, payslip: p.slip.id } } });
    setSent(id);
    toast.show("Question sent to HR.", () => {
      dispatch({ type: "req-new-undo", id });
      setSent(null);
    });
  };
  return (
    <div className={s.body}>
      <h3 className={s.line}>{p.line.label}</h3>
      <div className={s.text}>
        {body.map((x, i) => <p key={i}><Words sentence={x} /></p>)}
      </div>
      <section aria-labelledby="ask-q">
        <h3 id="ask-q" className={s.sub}>Questions you may have</h3>
        <ul className={s.qs}>
          {questions.map((q) => (
            <li key={q.id}>
              <button type="button" className={s.q}
                aria-expanded={openQ === q.id}
                onClick={() => setOpenQ(openQ === q.id ? null : q.id)}>
                <Words sentence={q.label} />
              </button>
              {openQ === q.id && (
                <div className={s.answer}>
                  {q.answer.map((x, i) => (
                    <p key={i}><Words sentence={x} /></p>))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <p className={s.rule}>
        Answers are worked out from your payslip and the company rules.
        They are not written by a person.
      </p>
      {sent !== null ? (
        <p className={s.sent} role="status">
          Sent to HR with the line and the amount.{" "}
          <a href={hrefOf("me", "hr-requests", sent)}>See your request</a>
        </p>
      ) : asking ? (
        <form className={s.form} onSubmit={(e) => {
          e.preventDefault();
          send();
        }}>
          <label className={s.label} htmlFor="ask-hr-text">
            Your question to HR
          </label>
          <textarea id="ask-hr-text" className={s.area} rows={4}
            value={text} onChange={(e) => setText(e.target.value)} />
          <div className={s.actions}>
            <button type="submit" className={[b.btn, b.primary].join(" ")}>
              Send to HR
            </button>
            <button type="button" className={[b.btn, b.secondary].join(" ")}
              onClick={() => setAsking(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className={[b.btn, b.secondary].join(" ")}
          onClick={() => setAsking(true)}>
          Ask HR about this line
        </button>
      )}
    </div>
  );
}
