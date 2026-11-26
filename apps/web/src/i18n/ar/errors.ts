// NEEDS NATIVE REVIEW: authored by Claude, not yet confirmed by a
// native speaker.
import type { errors as en } from "../en/errors";
import type { ArOf } from "../types";

export const errors: ArOf<typeof en> = {
  generic: "حدث خطأ. حاول مرة أخرى.",
  NETWORK: "تعذر الوصول إلى الخادم. تحقق من الاتصال وحاول مرة أخرى.",
  CONTRACT_MISMATCH: "أرسل الخادم بيانات لا يفهمها هذا التطبيق. أبلغ " +
    "عن ذلك مع المرجع أدناه.",
  VALIDATION_FAILED: "بعض البيانات غير صالحة. راجع الحقول المحددة.",
  COMPANY_HEADER_REQUIRED: "اختر شركة أولًا.",
  IDEMPOTENCY_KEY_REQUIRED: "الطلب غير مكتمل. حاول مرة أخرى.",
  INVITE_INVALID: "رابط الدعوة غير صالح.",
  MFA_CODE_INVALID: "رمز تطبيق المصادقة غير صحيح.",
  UNAUTHENTICATED: "انتهت جلستك. سجّل الدخول مرة أخرى.",
  INVALID_CREDENTIALS: "البريد الإلكتروني أو كلمة المرور أو الرمز غير " +
    "صحيح",
  FORBIDDEN: "دورك لا يسمح بهذا الإجراء.",
  TENANT_FORBIDDEN: "لست عضوًا في هذه الشركة.",
  MFA_REQUIRED: "سجّل الدخول مرة أخرى برمز تطبيق المصادقة للمتابعة.",
  MFA_ENROLMENT_REQUIRED: "أضف تطبيق مصادقة إلى حسابك أولًا.",
  SOD_VIOLATION: "لا يمكنك اعتماد شيء أنشأته بنفسك. يجب أن يعتمده شخص " +
    "آخر.",
  NOT_FOUND: "لم يُعثر على هذا العنصر. ربما حُذف.",
  EMAIL_TAKEN: "لهذا البريد الإلكتروني حساب بالفعل.",
  ALREADY_MEMBER: "هذا الشخص عضو في الشركة بالفعل.",
  MFA_ALREADY_ENROLLED: "تمت إضافة تطبيق مصادقة بالفعل.",
  MFA_NOT_STARTED: "ابدأ بإضافة تطبيق مصادقة أولًا.",
  EMPLOYEE_NUMBER_TAKEN: "هذا الرقم مستخدم لموظف آخر.",
  LEAVE_OVERLAP: "هذه التواريخ تتداخل مع طلب آخر لهذا الشخص.",
  LEAVE_NOT_PENDING: "تم البت في هذا الطلب بالفعل.",
  LEAVE_NOT_CANCELLABLE: "لم يعد من الممكن إلغاء هذا الطلب.",
  ALREADY_CLOCKED_IN: "تم تسجيل الحضور بالفعل.",
  NOT_CLOCKED_IN: "لم يُسجَّل الحضور.",
  IDEMPOTENCY_KEY_REUSED: "أُرسل هذا النموذج سابقًا ببيانات مختلفة. ابدأ " +
    "مسير الرواتب من جديد.",
  RUN_EXISTS_FOR_PERIOD: "يوجد مسير رواتب لهذا الشهر بالفعل.",
  RUN_NOT_DRAFT: "لم يعد مسير الرواتب هذا مسودة.",
  RUN_NOT_APPROVED: "اعتمد مسير الرواتب قبل إعداد ملف الرواتب.",
  INVITE_USED: "استُخدمت هذه الدعوة بالفعل.",
  INVITE_EXPIRED: "انتهت صلاحية هذه الدعوة. اطلب دعوة جديدة.",
  BASIC_COMPONENT_REQUIRED: "يلزم وجود مكوّن الراتب الأساسي.",
  DUPLICATE_COMPONENT: "أحد مكونات الراتب مكرر.",
  LEAVE_CROSSES_YEAR: "لا يمكن أن يمتد الطلب إلى السنة التالية. قسّمه " +
    "إلى طلبين.",
  INSUFFICIENT_BALANCE: "رصيد الإجازة لا يكفي لهذه التواريخ.",
  NO_EMPLOYEE_LINK: "حسابك غير مرتبط بموظف.",
  PAY_RUN_PROBLEMS: "يحتاج بعض الموظفين إلى بيانات إضافية قبل إنشاء " +
    "مسير الرواتب.",
  EMPLOYEE_NOT_IN_PERIOD: "هذا الشخص غير موظف في هذا الشهر.",
  ENTERED_AMOUNTS_REQUIRED: "أدخل مبالغ هذا الشهر لهذا الشخص.",
  SETTLEMENT_INPUT_REQUIRED: "أدخل بيانات الموظف المغادر.",
  COMPANY_WPS_SETTINGS_MISSING: "أضف رقم صاحب العمل في نظام حماية " +
    "الأجور ورمز توجيه البنك أولًا.",
  EMPLOYEE_BANK_MISSING: "بعض الموظفين بلا بيانات بنكية.",
  SIF_GENERATION_FAILED: "تعذر إعداد ملف الرواتب.",
  ENGINE_REFUSED: "هذه الحالة غير مشمولة بعد، لذلك لم يُحسب شيء.",
  ACCOUNT_LOCKED: "قُفل هذا الحساب بعد محاولات كثيرة. حاول لاحقًا.",
  INTERNAL: "واجه الخادم مشكلة. حاول مرة أخرى.",
};
