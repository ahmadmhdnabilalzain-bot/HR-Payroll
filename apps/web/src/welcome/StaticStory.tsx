import type { Fils } from "@payroll/engine";
import { useEffect, useRef, type ReactNode } from "react";
import { Wordmark } from "../shell/Wordmark";
import type { FaceWords } from "./faces";
import type { Story } from "./story";
import type { Copy } from "./Welcome";
import s from "./Welcome.module.css";

/**
 * The same five scenes as one composed page, for reduced motion and
 * for browsers without WebGL. Scenes fade in once as they arrive (no
 * fade at all when motion is reduced: base.css zeroes transitions).
 */
export function StaticStory(p: { story: Story; copy: Copy[];
  words: FaceWords; money: (f: Fils) => string; name: string;
  button: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (el === null) return undefined;
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        if (e.isIntersecting) e.target.setAttribute("data-in", "");
      }
    }, { threshold: 0.2 });
    el.querySelectorAll("section").forEach((x) => io.observe(x));
    return () => io.disconnect();
  }, []);
  const { story, copy, words: w, money: m } = p;
  const slip = story.payslip;
  const fig = slip.lines[slip.figure];
  const head = (i: number) => (
    <>
      <h2 className={s.title}>{copy[i]?.title}</h2>
      <p className={s.body}>{copy[i]?.body}</p>
    </>
  );
  return (
    <div ref={root} className={s.flat}>
      <section className={`${s.scene} ${s.sceneCentre}`}>
        <h1 className={s.flatMark}><Wordmark height={64} label={p.name} />
        </h1>
        {head(0)}
      </section>
      <section className={s.scene}>
        <div className={s.sceneCopy}>{head(1)}</div>
        <div className={s.figure}>
          <div className={s.paper}>
            <p className={s.meta}>{w.payslip} · {w.month}</p>
            <p className={s.name}>{slip.name}</p>
            <dl className={s.lines}>
              {slip.lines.map((l, i) => i === slip.figure ? null : (
                <div key={l.label}><dt>{l.label}</dt>
                  <dd>{l.fils === null ? "" : m(l.fils)}</dd></div>
              ))}
              <div className={s.net}><dt>{w.netPay}</dt>
                <dd>{m(slip.netFils)}</dd></div>
            </dl>
          </div>
          <div className={s.lifted}>
            <p className={s.chip}><span>{fig?.label}</span>
              <span>{fig?.fils == null ? "" : m(fig.fils)}</span></p>
            <p className={s.meta}>{w.working}</p>
            <ol className={s.steps}>
              {slip.steps.map((x) => (
                <li key={x.label}><span>{x.label}</span>
                  <span>{x.fils === null ? "" : m(x.fils)}</span></li>
              ))}
            </ol>
          </div>
        </div>
      </section>
      <section className={s.scene}>
        <div className={s.sceneCopy}>{head(2)}</div>
        <div className={s.figure}>
          <p className={s.total}><span className={s.meta}>{w.fileTotal}</span>
            <span className={s.big}>{m(story.file.afterFils)}</span>
            <span className={s.meta}>{w.heldIn(m(story.file.heldFils))}</span>
          </p>
          <ul className={s.rows}>
            {story.rows.map((r) => (
              <li key={r.id} data-flag={r.flag === null ? undefined : ""}>
                <span><strong>{r.name}</strong>
                  <span className={s.meta}>{r.flag === null ? r.department
                    : `${w.ibanEnding(r.flag.ibanLast4)} · ` +
                      w.checksOut}</span></span>
                <span>{m(r.netFils)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className={s.scene}>
        <div className={s.sceneCopy}>{head(3)}</div>
        <ul className={`${s.figure} ${s.cards}`}>
          {story.approvals.map((a) => (
            <li key={a.id}>
              <strong>{a.title}</strong>
              <span className={s.meta}>{a.who}</span>
              {a.amountFils !== null && <span className={s.amount}>
                {m(a.amountFils)}</span>}
              <span className={s.signed}>{w.signedOff(a.signer)}</span>
            </li>
          ))}
        </ul>
      </section>
      <section id="welcome-end" className={`${s.scene} ${s.sceneCentre}`}>
        <span className={s.flatMark}><Wordmark height={48}
          label={p.name} /></span>
        {head(4)}
        {p.button}
      </section>
    </div>
  );
}
