// NEEDS NATIVE REVIEW: authored by Claude, not yet confirmed by a
// native speaker.
import type { tpl as en } from "../en/tpl";
import type { ArOf } from "../types";

export const tpl: ArOf<typeof en> = {
  search: "بحث",
  filter: "تصفية",
  shown: "{n} من {total}",
  close: "إغلاق",
  cancel: "إلغاء",
  save: "حفظ",
  edit: "تعديل",
  required: "حقل {field} مطلوب.",
  makerChecker: "أعدّه {maker}. ويقرر {checker}.",
  prevMonth: "السابق",
  nextMonth: "التالي",
  who: "من",
  csv: "تنزيل CSV",
  print: "طباعة",
  changes: "التغييرات",
  noChanges: "لا تغييرات بعد.",
  more: "إجراءات أخرى",
  hiddenCsv: "أظهر المبالغ للتنزيل",
  sources: "بيانات تجريبية خيالية. القواعد كما نفهمها.",
  next: "التالي",
  history: "السجل",
  summary: "ملخص",
  open: "فتح",
  axisFrom: "يبدأ المحور عند {v}",
};
