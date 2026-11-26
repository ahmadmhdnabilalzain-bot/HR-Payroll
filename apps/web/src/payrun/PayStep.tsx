import { useEffect, useState } from "react";
import { useRunApproval } from "../demo/actions";
import { useRunDetail } from "../demo/useRunDetail";
import { formatDate, formatNumber, formatTime } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import { useDemo } from "../demo/state";
import { demoClockIso, nowMs } from "./model";
import { FILE_DOWNLOADED } from "./RunBar";
import s from "./PayRun.module.css";

/** When the file was downloaded in this visit (ms), if it was. */
let downloadedAt: number | null = null;

function useDownloaded(): number | null {
  const [at, setAt] = useState(downloadedAt);
  useEffect(() => {
    const on = (): void => {
      downloadedAt = nowMs();
      setAt(downloadedAt);
    };
    addEventListener(FILE_DOWNLOADED, on);
    return () => removeEventListener(FILE_DOWNLOADED, on);
  }, []);
  return at;
}

/**
 * Step 4: the salary file, named in one sentence (people, amount, bank,
 * date), its summary, what the file check found in plain words, and
 * the file line by line. Never a claim that anyone accepted it.
 */
export function PayStep() {
  const { lang, t } = useLocale();
  const { state } = useDemo();
  const a = useRunApproval();
  const d = useRunDetail();
  const f = d.file;
  const ready = a.phase === "file";
  const got = useDownloaded();
  const issues = f.findings.filter((x) => x.kind === "issue");
  return (
    <section aria-labelledby="step-title" className={s.step}>
      <h2 id="step-title" className={s.stepTitle}>{t("payrun.payTitle")}</h2>
      <p className={s.stepSub}>{t("payrun.paySub")}</p>

      {/* The file as an object: what it is, the amount at display
          size, where it goes, and its state. Download is the row's
          one primary action above. */}
      <div className={s.fileCard} data-ready={ready}>
        <span className={s.fileGlyph} aria-hidden="true">
          <Icon name="file" size={28} />
          <span className={s.fileExt}>SIF</span>
        </span>
        <div className={s.fileCardText}>
          <p className={s.fileLabel}>{t("payrun.fileLabel")}</p>
          <p className={s.fileFigure}>
            <Money value={f.total} size="hero" tween={false} />
          </p>
          <p className={s.fileMeta}>
            {t("payrun.fileMeta", { count: f.people, bank: f.bank,
              date: formatDate(f.dated, lang) })}
          </p>
          <p className={s.status} data-tone={ready ? "ok" : "warn"}
            role="status">
            <span className={s.pip} aria-hidden="true" />
            {!ready ? t("payrun.draft")
              : got !== null ? t("payrun.downloaded", { bank: f.bank,
                time: formatTime(demoClockIso(got, f.dated, f.time),
                  lang) })
                : t("payrun.ready", { bank: f.bank })}
          </p>
        </div>
      </div>

      <section aria-labelledby="summary-title" className={s.block}>
        <h3 id="summary-title" className={s.blockTitle}>
          {t("payrun.summaryTitle")}
        </h3>
        <dl className={`${s.group} ${s.summary}`}>
          <div className={s.sumLine}>
            <dt>{t("payrun.sumPeople")}</dt>
            <dd className="tabular">{formatNumber(f.people, lang)}</dd>
          </div>
          <div className={s.sumLine}>
            <dt>{t("payrun.sumAmount")}</dt>
            <dd><Money value={f.total} tween={false} /></dd>
          </div>
          <div className={s.sumLine}>
            <dt>{t("payrun.sumBank")}</dt>
            <dd>{f.bank}</dd>
          </div>
          <div className={s.sumLine}>
            <dt>{t("payrun.sumDated")}</dt>
            <dd>{formatDate(f.dated, lang)}</dd>
          </div>
          <div className={s.sumLine}>
            <dt>{t("payrun.fileName")}</dt>
            <dd className={s.mono}>{f.fileName}</dd>
          </div>
          <div className={s.sumLine}>
            <dt>{t("payrun.lines")}</dt>
            <dd>{t("payrun.linesValue", {
              total: formatNumber(f.lines.total, lang),
              salary: formatNumber(f.lines.salary, lang),
              allowance: formatNumber(f.lines.allowance, lang),
              control: formatNumber(f.lines.control, lang) })}</dd>
          </div>
          <div className={s.sumLine}>
            <dt>{t("payrun.heldOut")}</dt>
            <dd>{f.heldOut === 0 ? t("payrun.nobody")
              : t("payrun.fileLine", { count: f.heldOut })}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="findings-title" className={s.block}>
        <h3 id="findings-title" className={s.blockTitle}>
          {t("payrun.findingsTitle")}
        </h3>
        <p className={s.blockSub}>{t("payrun.findingsSub")}</p>
        {issues.length === 0 && (
          <p className={s.allGood}>
            <Icon name="check" size={18} />{t("payrun.findingsNone")}
          </p>
        )}
        {issues.length > 0 && (
          <ul className={s.group}>
            {issues.map((x) => (
              <li key={x.id} className={s.row}>
                <span className={s.rowMain}>
                  <span className={s.kind}>
                    <span className={s.dot8} data-tone="bad"
                      aria-hidden="true" />
                    {t("payrun.needsFix")}
                  </span>
                  <span className={s.name}>{x.title}</span>
                  <span className={s.reasonMain}>{x.text}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="records-title" className={s.block}>
        <h3 id="records-title" className={s.blockTitle}>
          {t("payrun.recordsTitle")}
        </h3>
        <p className={s.blockSub}>{f.linesNote}</p>
        <table className={`${s.table} ${s.records}`}>
          <thead>
            <tr>
              <th scope="col" className={s.lineCol}>{t("payrun.colLine")}</th>
              <th scope="col">{t("payrun.colName")}</th>
              <th scope="col" className={s.acctCol}>
                {t("payrun.colAccount")}
              </th>
              <th scope="col" className={s.numCol}>{t("payrun.colDays")}</th>
              <th scope="col" className={s.numCol}>
                {t("payrun.colFixed")}
              </th>
              <th scope="col" className={s.numCol}>
                {t("payrun.colVariable")}
              </th>
              <th scope="col" className={s.numCol}>{t("payrun.colTotal")}</th>
            </tr>
          </thead>
          <tbody>
            {f.records.map((r) => (
              <tr key={r.line}>
                <td className={s.lineCol} data-label={t("payrun.colLine")}>
                  <span className="tabular">{r.line}</span>
                </td>
                <th scope="row" className={s.who}>
                  <span className={s.name}>{r.name}</span>
                </th>
                <td className={`${s.acctCol} ${s.mono}`}
                  data-label={t("payrun.colAccount")}>{r.account}</td>
                <td className={`${s.numCol} ${s.wideOnly}`}
                  data-label={t("payrun.colDays")}>
                  <span className="tabular">{r.days}</span>
                </td>
                <td className={`${s.numCol} ${s.wideOnly}`}
                  data-label={t("payrun.colFixed")}>
                  <Money value={r.fixed} size="sm" tween={false} />
                </td>
                <td className={`${s.numCol} ${s.wideOnly}`}
                  data-label={t("payrun.colVariable")}>
                  <Money value={r.variable} size="sm" tween={false} />
                </td>
                <td className={s.numCol} data-label={t("payrun.colTotal")}>
                  <Money value={r.total} size="sm" tween={false} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <details className={s.raw}>
          <summary>{t("payrun.showText")}</summary>
          <pre className={s.pre} dir="ltr">{state.hideAmounts
            ? t("shell.amountsHidden") : f.text}</pre>
        </details>
      </section>
    </section>
  );
}
