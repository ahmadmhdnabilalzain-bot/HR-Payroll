// NEEDS NATIVE REVIEW: authored by Claude, not yet confirmed by a
// native speaker.
import type { explain as en } from "../en/explain";
import type { ArOf } from "../types";

export const explain: ArOf<typeof en> = {
  title: "كيف حُسب هذا الرقم",
  open: "شرح {label}",
  close: "إغلاق",
  rules: "القواعد المستخدمة",
  noRules: "مجموع البنود أعلاه؛ لا قاعدة خاصة به.",
  statusOfficial: "مصدر رسمي",
  statusSecondary: "مصدر ثانوي",
  statusConvention: "اختيار النظام، وليس نصًا قانونيًا",
  statusHypothetical: "افتراض، يحتاج إلى تأكيد",
  statusUnsourced: "بلا مصدر بعد، يحتاج إلى تأكيد",
  noSource: "لا يوجد مصدر مكتوب.",
  notComputed: "غير محسوب",
};
