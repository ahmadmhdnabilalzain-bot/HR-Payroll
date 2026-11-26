// NEEDS NATIVE REVIEW: authored by Claude, not yet confirmed by a
// native speaker.
import type { welcome as en } from "../en/welcome";
import type { ArOf } from "../types";

export const welcome: ArOf<typeof en> = {
  label: "الافتتاحية",
  skip: "تخطٍّ",
  scroll: "مرّر للبدء",
  s1Title: "الرواتب بوضوح.",
  s1Body: "شهر كامل من الرواتب، من أول رقم إلى ملف البنك.",
  s2Title: "كل رقم مشروح.",
  s2Body: "افتح أي رقم في قسيمة الراتب وشاهد طريقة حسابه.",
  s3Title: "المشكلات تُكتشف قبل أن تكلّفك.",
  s3Body: "تُكتشف بيانات البنك الناقصة أو الخاطئة قبل إرسال ملف " +
    "الرواتب.",
  s4Title: "شاشة واحدة لكل قرار.",
  s4Body: "دورات الرواتب والإجازات والمصروفات في مكان واحد، كلٌّ " +
    "للشخص المناسب.",
  s5Title: "مصمَّم للإمارات.",
  s5Body: "ملفات رواتب WPS والإجازات ونهاية الخدمة، محسوبة وفق " +
    "قواعد الإمارات كما نفهمها.",
  open: "افتح العرض التجريبي",
  payslip: "قسيمة الراتب",
  netPay: "صافي الراتب",
  working: "طريقة الحساب",
  stopsPay: "يوقف الدفع",
  fixed: "أُدخلت بيانات البنك",
  ibanEnding: "رقم IBAN ينتهي بـ {last}",
  checksOut: "صحيح",
  fileTotal: "إجمالي ملف الرواتب",
  heldIn: "{amount} كان محتجزاً، وهو الآن في الملف",
  signedOff: "وقّع عليه {name}",
  signed: "تم التوقيع",
  decisions: "بانتظار قرار",
  allNet: "صافي الرواتب لهذا الشهر",
};
