// NEEDS NATIVE REVIEW: authored by Claude, not yet confirmed by a
// native speaker.
import type { common as en } from "../en/common";
import type { ArOf } from "../types";

export const common: ArOf<typeof en> = {
  language: "اللغة",
  english: "English",
  arabic: "العربية",
  theme: "المظهر",
  themeLight: "فاتح",
  themeDark: "داكن",
  themeSystem: "حسب الجهاز",
  sampleData: "بيانات تجريبية",
  sampleDataHint: "بيانات تجريبية في هذا المتصفح فقط. إعادة تحميل الصفحة " +
    "تعيدها إلى العينة، فلا تُحفظ التغييرات.",
  arReviewBanner: "النص العربي بانتظار مراجعة متحدث أصلي",
  building: "هذا التطبيق قيد البناء. الشاشات قادمة.",
  loading: "جارٍ التحميل",
  tryAgain: "حاول مرة أخرى",
  reference: "المرجع: {requestId}",
  employees: {
    zero: "لا يوجد موظفون",
    one: "موظف واحد",
    two: "موظفان",
    few: "{count} موظفين",
    many: "{count} موظفًا",
    other: "{count} موظف",
  },
  days: {
    zero: "لا أيام",
    one: "يوم واحد",
    two: "يومان",
    few: "{count} أيام",
    many: "{count} يومًا",
    other: "{count} يوم",
  },
};
