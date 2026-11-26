/**
 * Screen templates (navigation map, section 4). Area packages fill a
 * template from a config and demo data; they do not design screens.
 * Contracts and one worked example each: apps/web/DEMO.md, "For
 * builders of area packages".
 */
export { ApprovalForm } from "./ApprovalForm";
export type { FieldKind, FormField, FormValues } from "./ApprovalForm";
export { StatusPill } from "./StatusPill";
export type { StatusTone } from "./StatusPill";
export { FilterList, SHORT_LIST } from "./FilterList";
export type { ListColumn, ListSegment, ListSummary } from "./FilterList";
export { MonthCalendar } from "./MonthCalendar";
export type { CalEvent, CalTone } from "./MonthCalendar";
export { MoreMenu } from "./Menu";
export type { MenuItem } from "./Menu";
export { PageHead } from "./PageHead";
export type { Crumb } from "./PageHead";
export { KeyValues, RecordTabs } from "./RecordTabs";
export type { RecordStat, RecordTab } from "./RecordTabs";
export { BarChart, compact, Waterfall } from "./Chart";
export type { BarDatum, WaterfallStep } from "./Chart";
export { PageFoot } from "./PageFoot";
export { Loading } from "./Loading";
export { RowDecision } from "./RowDecision";
export type { RowChoice } from "./RowDecision";
export { Paper, PaperLine } from "./Paper";
export { CellView, ReportPage, toCsv } from "./ReportPage";
export type { Cell, ReportColumn } from "./ReportPage";
export { SettingsPage } from "./SettingsPage";
export type { ChangeLogEntry, Setting, SettingsGroup } from "./SettingsPage";
export { Sheet } from "./Sheet";
