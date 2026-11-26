import { useState } from "react";
import b from "../ui/button.module.css";
import p from "./policies/policies.module.css";

/** The steps of a walkthrough: open the page, then the card's own
 * steps, then a look at the result. 3 to 6 steps, all in words. */
export function walkSteps(steps: readonly string[]): string[] {
  return ["Open the page with the link on this card.", ...steps,
    "Check the result. It names who did it and when."];
}

/**
 * "Walkthrough: 90 seconds": a step-by-step tour of one help card,
 * read at your own pace. It is a guided list, not a video: the step you
 * are on is outlined, and Next and Back move it. The page opens from
 * the card's own link.
 */
export function Walkthrough(p2: { title: string; steps: readonly string[];
  href: string; go: string }) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const steps = walkSteps(p2.steps);
  const last = steps.length - 1;
  if (!open) {
    return (
      <button type="button" className={`${b.btn} ${b.secondary}`}
        aria-expanded="false" aria-label={`Walkthrough: 90 seconds, ` +
          p2.title}
        onClick={() => { setAt(0); setOpen(true); }}>
        Walkthrough: 90 seconds</button>
    );
  }
  return (
    <div className={p.tour} role="group"
      aria-label={`Walkthrough: ${p2.title}`}>
      <p role="status" style={{ margin: 0 }}>
        <strong>{`Step ${String(at + 1)} of ${String(steps.length)}`}</strong>
      </p>
      <div className={p.tourBar} aria-hidden="true">
        <span style={{ inlineSize: `${String(((at + 1) / steps.length) *
          100)}%` }} />
      </div>
      <ol className={p.tourSteps}>
        {steps.map((x, i) => (
          <li key={x} aria-current={i === at ? "step" : undefined}>{x}</li>
        ))}
      </ol>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)",
        alignItems: "center" }}>
        <button type="button" className={`${b.btn} ${b.quiet}`}
          disabled={at === 0} onClick={() => setAt(at - 1)}>Back</button>
        {at < last ? (
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => setAt(at + 1)}>Next</button>
        ) : (
          <a className={`${b.btn} ${b.primary}`} href={p2.href}>{p2.go}</a>
        )}
        <button type="button" className={`${b.btn} ${b.quiet}`}
          onClick={() => setOpen(false)}>Close</button>
      </div>
    </div>
  );
}
