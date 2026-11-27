// NEEDS NATIVE REVIEW: authored by Claude, not yet confirmed by a
// native speaker.
import type { reports as en } from "../en/reports";
import type { ArOf } from "../types";

export const reports: ArOf<typeof en> = {
  title: "التقارير",
  askTitle: "اطلب تقريرًا",
  askSub: "اكتب ما تريد رؤيته بكلمات بسيطة؛ يُفتح التقرير المطابق " +
    "مع التصفية المناسبة. أو اختر تقريرًا من القائمة.",
  sub: "كل تقرير مأخوذ مباشرة من بيانات هذا الشهر. نزّله كجدول أو اطبعه.",
  loading: "جارٍ تحميل التقرير",
  csv: "تنزيل CSV",
  print: "طباعة",
  hiddenCsv: "أظهر المبالغ للتنزيل",
  foot: "{count} صف.",
  summaryTitle: "ملخص الرواتب",
  summaryBlurb: "مجاميع هذا الشهر بجانب الشهر الماضي.",
  summaryNote: "المجاميع حاصل جمع القسائم تمامًا.",
  deptTitle: "التكلفة حسب القسم",
  deptBlurb: "إجمالي الرواتب الشهرية وعدد الموظفين لكل قسم.",
  deptNote: "التكلفة هي إجمالي الرواتب الشهرية من هذه الدورة.",
  natTitle: "عدد الموظفين حسب الجنسية",
  natBlurb: "عدد الموظفين من كل جنسية.",
  natNote: "العدد فقط، بتاريخ {date}. بيانات تجريبية، والنظام الخاص " +
    "بالبنوك قيد التأكيد.",
  docTitle: "مستندات تنتهي قريبًا",
  docBlurb: "الإقامات والهويات الإماراتية، الأقرب أولًا.",
  docNote: "المتابَع هنا: الإقامات والهويات الإماراتية التي لها تاريخ " +
    "انتهاء مسجّل. جوازات السفر والعقود غير متابَعة في هذا العرض. " +
    "الأيام المتبقية محسوبة من تاريخ اليوم في العرض. أرقام الهوية " +
    "تبقى مخفية في القائمة وفي ملف CSV.",
  filesTitle: "سجل ملفات الرواتب",
  filesBlurb: "كل ملف رواتب أُنشئ، بعدد موظفيه ومبلغه وتاريخه.",
  filesNote: "يفحص البنك كل ملف مجددًا عند رفعه.",
  colItem: "البند",
  colChange: "التغيير",
  inFile: "في ملف الرواتب",
  peopleInFile: "الموظفون في ملف الرواتب",
  colDept: "القسم",
  colPeople: "الموظفون",
  colCost: "إجمالي التكلفة",
  colShare: "النسبة",
  colNationality: "الجنسية",
  total: "المجموع",
  colEmployee: "الموظف",
  colDocument: "المستند",
  colExpires: "ينتهي",
  colDaysLeft: "الأيام المتبقية",
  colStatus: "الحالة",
  expired: "منتهي",
  within30: "خلال 30 يومًا",
  within90: "خلال 90 يومًا",
  valid: "ساري",
  colFile: "الملف",
  colMonth: "الشهر",
  colTotal: "المجموع",
  colDated: "التاريخ",
  fileDraft: "مسودة بانتظار التوقيع",
  fileReady: "جاهز للرفع",
};
