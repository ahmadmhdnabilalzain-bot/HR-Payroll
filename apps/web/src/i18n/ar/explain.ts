// NEEDS NATIVE REVIEW: authored by Claude, not yet confirmed by a
// native speaker.
import type { explain as en } from "../en/explain";
import type { ArOf } from "../types";

export const explain: ArOf<typeof en> = {
  open: "طريقة الحساب: {title}",
  close: "إغلاق",
  working: "طريقة الحساب",
  inputs: "المدخلات",
  rules: "القواعد المستخدمة",
  notDone: "غير محسوب هنا",
  official: "رسمي",
  secondary: "مصدر ثانوي",
  convention: "عرف متبع",
  unsourced: "بلا مصدر",
  scope: "{scope}. بيانات وهمية.",
  how: "طريقة الحساب",
};
