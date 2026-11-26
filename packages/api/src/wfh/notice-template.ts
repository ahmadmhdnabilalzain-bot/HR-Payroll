export interface NoticeFacts {
  companyName: string;
  version: number;
  retentionDays: number;
  categories: boolean;
  locationHourly: boolean;
  legalReview: string;
  companyNote: string | null;
}

const ITEM_ACTIVE = [
  "Active time: whether you used your computer in each minute (yes or",
  "   no). Not what you typed."].join("\n");
const ITEM_CATEGORIES = [
  "App and website categories: one category per minute, such as",
  "   \"documents\" or \"meetings\". Not page contents, window titles, web",
  "   addresses or messages."].join("\n");
const ITEM_LOCATION = [
  "Location: one reading about once an hour, stored rounded to about",
  "   110 metres."].join("\n");

function items(f: NoticeFacts): string {
  const list = [ITEM_ACTIVE];
  if (f.categories) list.push(ITEM_CATEGORIES);
  if (f.locationHourly) list.push(ITEM_LOCATION);
  return list.map((x, i) => `${i + 1}. ${x}`).join("\n");
}

const NOT_REVIEWED =
  "Legal review: this wording has not been reviewed by a lawyer.";
const REVIEWED =
  "Legal review: this\nwording was reviewed by the company's counsel.";

/**
 * The notice an employee reads before consenting, exactly as Plan 9
 * words it. It cites no article numbers (sources: PDPL Arts 4, 5(7),
 * 6, 13 and 15, English translation, READ). Arabic is not produced
 * until a native speaker reviews it.
 */
export function renderNotice(f: NoticeFacts): string {
  const who = f.locationHourly
    ? "HR and the owner see daily totals and the hourly locations."
    : "HR and the owner see daily totals.";
  const text = `Work-from-home tracking notice (version ${f.version})

${f.companyName} asks to record the following while you are clocked in
for remote work, and only then:
${items(f)}

Never recorded: screenshots, screen video, keystrokes, page contents,
window titles, web addresses, camera or microphone. The product has no
setting that turns these on.

You can see everything recorded about you, pause at any time and
download a copy. Paused time is shown as paused.

Who sees it: you see all of it. Your manager sees daily totals only.
${who}

It is never used to calculate pay. A person reviews it before it
affects attendance or overtime.

It is deleted after ${f.retentionDays} days. ${f.companyName} set this
period; the UAE data protection law (Federal Decree-Law 45 of 2021)
sets no fixed period.

You may decline, or withdraw your consent at any time. Withdrawing
stops recording at once and lets you erase what was recorded.

${f.legalReview === "reviewed-by-company-counsel" ? REVIEWED
    : NOT_REVIEWED}`;
  return f.companyNote === null ? text
    : `${text}\n\nNote from ${f.companyName}:\n${f.companyNote}`;
}
