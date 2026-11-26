/**
 * Screen templates (navigation map, section 4). Area packages fill a
 * template from a config and demo data; they do not design screens.
 * Contracts and one worked example each: apps/web/DEMO.md, "For
 * builders of area packages".
 */
export { ApprovalForm } from "./ApprovalForm";
export type { FieldKind, FormField, FormValues } from "./ApprovalForm";
export { FilterList } from "./FilterList";
export type { ListColumn, ListSegment } from "./FilterList";
export { MonthCalendar } from "./MonthCalendar";
export type { CalEvent, CalTone } from "./MonthCalendar";
export { MoreMenu } from "./Menu";
export type { MenuItem } from "./Menu";
export { PageHead } from "./PageHead";
export type { Crumb } from "./PageHead";
export { KeyValues, RecordTabs } from "./RecordTabs";
export type { RecordStat, RecordTab } from "./RecordTabs";
export { ReportPage, toCsv } from "./ReportPage";
export type { ReportColumn } from "./ReportPage";
export { SettingsPage } from "./SettingsPage";
export type { ChangeLogEntry, Setting, SettingsGroup } from "./SettingsPage";
export { Sheet } from "./Sheet";
