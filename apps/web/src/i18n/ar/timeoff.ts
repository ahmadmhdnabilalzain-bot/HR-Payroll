// NEEDS NATIVE REVIEW: authored by Claude, not yet confirmed by a
// native speaker.
import type { timeoff as en } from "../en/timeoff";
import type { ArOf, ArPlural } from "../types";

const all = (s: string): ArPlural =>
  ({ zero: s, one: s, two: s, few: s, many: s, other: s });

/** Day counts; {n} is the shown number ("22½"), count the plural. */
const days = (pre: string, post: string): ArPlural => ({
  ...all(`${pre}{n} يومًا${post}`), one: `${pre}{n} يوم${post}`,
  two: `${pre}يومان${post}`, few: `${pre}{n} أيام${post}` });
const counted = (pre: string, post: string): ArPlural => ({
  ...all(`${pre}{count} يومًا${post}`), one: `${pre}يوم واحد${post}`,
  two: `${pre}يومان${post}`, few: `${pre}{count} أيام${post}` });

export const timeoff: ArOf<typeof en> = {
  title: "الإجازات",
  leadMine: "رصيدك وطلباتك يا {name}.",
  leadTeam: "رصيدك وطلبات فريقك ومن في إجازة.",
  leadAll: "طلبات الجميع ومن في إجازة.",
  request: "طلب إجازة",
  balances: "رصيدك",
  annual: "الإجازة السنوية",
  annualLeft: days("متبقٍ ", ""),
  annualMade: "{accrued} مكتسبة هذا العام، {taken} مأخوذة، " +
    "{pending} بانتظار القرار",
  sick: "الإجازة المرضية",
  sickUsed: days("", " هذا العام"),
  sickNote: "لا يوجد رصيد ثابت. يتبع أجر كل يوم قواعد الرواتب " +
    "ويظهر اليوم غير المدفوع في قسيمة الراتب.",
  unpaid: "الإجازة بدون راتب",
  unpaidUsed: days("", " هذا العام"),
  unpaidNote: "غير مدفوعة: تُخصم الأيام من راتب ذلك الشهر.",
  notJoined: "ينضم لاحقًا هذا العام: لا رصيد بعد.",
  requests: "الطلبات",
  requestsMine: "طلباتك",
  requestsEmpty: "لا طلبات بعد. تظهر هنا الإجازات التي تطلبها، " +
    "ومن يقرر فيها.",
  requestsEmptyAll: "لا توجد طلبات إجازة بعد.",
  waitingFor: "بانتظار {name}، {role}",
  overlapsWith: "نفس الأيام مثل {names}",
  booked: "محجوزة",
  bookedBy: "حجزها {name}، {role}، {date}",
  declined: "مرفوضة",
  declinedBy: "رفضها {name}، {role}، {date}",
  withdrawn: "مسحوبة",
  withdraw: "سحب الطلب",
  withdrew: "سُحب الطلب",
  approve: "حجز",
  decline: "رفض",
  bookedToast: "حُجزت إجازة {name}",
  declinedToast: "رُفض طلب {name}",
  waitingForYou: "بانتظارك",
  decidedToast: "طلب {name}: {verdict}",
  verdictBooked: "محجوز",
  verdictDeclined: "مرفوض",
  needsYou: { ...all("{count} طلبًا بانتظار قرارك"),
    one: "طلب واحد بانتظار قرارك", two: "طلبان بانتظار قرارك",
    few: "{count} طلبات بانتظار قرارك" },
  sheetTitle: "طلب إجازة",
  sheetFor: "لـ {name}",
  type: "النوع",
  firstDay: "اليوم الأول",
  lastDay: "اليوم الأخير",
  reason: "السبب",
  note: "ملاحظة إلى {name}",
  notePlaceholder: "اختياري",
  workingDays: days("", " عمل"),
  weekendsSkipped: counted("لا يُحتسب ", " من عطلة نهاية الأسبوع"),
  afterThis: "يتبقى {days} بعد هذا الطلب",
  holidaysSkipped: counted("لا يُحتسب ", " من العطلات الرسمية"),
  holidayNote: "تُحتسب أيام العمل فقط: تُستثنى عطلة نهاية الأسبوع " +
    "والعطلات الرسمية في الإعدادات.",
  legendRest: "عطلة نهاية الأسبوع أو عطلة رسمية (لا تُحتسب)",
  goesTo: "يُرسل إلى {name}، {role}",
  send: "إرسال الطلب",
  cancel: "إلغاء",
  errEnd: "اليوم الأخير قبل اليوم الأول.",
  errNone: "كل هذه الأيام من عطلة نهاية الأسبوع.",
  errOver: "هذا أكثر من {days} المتبقية من الإجازة السنوية.",
  errYear: "اختر أيامًا في 2026، سنة هذا الرصيد.",
  errOverlap: "لديك إجازة بالفعل في بعض هذه الأيام.",
  sent: "أُرسل إلى {name}",
  calendar: "من في إجازة",
  prevMonth: "الشهر السابق",
  nextMonth: "الشهر التالي",
  legendBooked: "محجوزة",
  legendWaiting: "بانتظار القرار",
  calendarEmpty: "لا أحد في إجازة في {month}.",
  offCount: { ...all("{count} موظفًا في إجازة"),
    one: "موظف واحد في إجازة", two: "موظفان في إجازة",
    few: "{count} موظفين في إجازة" },
  phoneDays: "{range} · {days}",
  employee: "الموظف",
  dates: "التواريخ",
  length: "المدة",
  status: "الحالة",
};
