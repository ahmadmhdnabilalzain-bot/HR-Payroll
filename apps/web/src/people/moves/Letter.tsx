import type { LetterLine } from "../../demo/data/moves-types";
import { Money } from "../../ui/Money";
import { Paper, PaperLine } from "../../ui/templates";

/**
 * An offer letter drawn as a page: the company's letterhead with the
 * date, the title, the text, the pay lines with leaders (the total in
 * bold), and the sign-off as the signature block. Pay lines go through
 * <Money>, so hiding amounts hides them here too. The lines come from
 * the data in order: company, title, date, then the body.
 */
export function Letter(p: { lines: LetterLine[] }) {
  const text = (l: LetterLine | undefined): string =>
    l !== undefined && l.kind === "text" ? l.text : "";
  const [company, title, date, ...rest] = p.lines;
  const last = rest.at(-1);
  const signed = last !== undefined && last.kind === "text" &&
    /^(Signed off|Draft)/.test(last.text);
  const body = signed ? rest.slice(0, -1) : rest;
  const totalAt = body.reduce((n, l, i) => l.kind === "pay" ? i : n, -1);
  return (
    <Paper label="Offer letter" company={text(company)} title={text(title)}
      date={text(date)} sign={signed ? text(last) : undefined}>
      {body.map((l, i) => l.kind === "pay" ? (
        <PaperLine key={i} label={l.label} total={i === totalAt}
          value={<Money value={l.fils} size="md" tween={false} />} />
      ) : l.text === "" ? null : <p key={i}>{l.text}</p>)}
    </Paper>
  );
}
