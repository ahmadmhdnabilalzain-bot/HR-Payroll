// NEEDS NATIVE REVIEW: authored by Claude, not yet confirmed by a
// native speaker.
import type { errors as en } from "../en/errors";
import type { ArOf } from "../types";
import { timeErrors } from "./errors-time";

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
  INVITE_NOT_FOUND: "لم يُعثر على هذه الدعوة. اطلب دعوة جديدة.",
  LAST_OWNER: "يجب أن يكون للشركة مالك واحد على الأقل. اجعل شخصًا آخر " +
    "مالكًا أولًا.",
  RUN_INPUTS_CHANGED: "تغيرت الرواتب أو الإجازات غير المدفوعة منذ إنشاء " +
    "هذه المسودة. ألغها وأنشئ مسير الرواتب من جديد.",
  SALARY_MISSING: "لم يُحدَّد راتب لهذا الشخص.",
  PAYLOAD_TOO_LARGE: "الطلب كبير جدًا.",
  EMPLOYEE_ALREADY_LINKED: "هذا الشخص مرتبط بحساب مستخدم بالفعل.",
  MANAGER_CYCLE: "لا يمكن أن يتبع شخصٌ لمن يتبع له.",
  EMPLOYEE_DATA_UNREADABLE: "تعذّرت قراءة بعض بيانات الموظفين المحفوظة. " +
    "اطلب من الدعم فحصها.",
  RUN_EMPTY: "لا يوجد موظفون في مسير الرواتب هذا. أضف أشخاصًا أولًا.",
  // Plan 6: approvals, receipts and expense claims.
  RECEIPT_BASE64_INVALID: "تعذّرت قراءة ملف الإيصال. حاول رفعه مرة أخرى.",
  NOT_AN_APPROVER: "لست من المعتمدين لهذه الخطوة.",
  APPROVER_NEEDED_LATER: "أنت مطلوب لخطوة لاحقة، لذا يجب أن يعتمد " +
    "هذه الخطوة شخص آخر.",
  APPROVAL_NOT_PENDING: "هذا الاعتماد مغلق بالفعل.",
  APPROVAL_STEP_CHANGED: "تقدّم هذا الاعتماد في الأثناء. حدّث الصفحة " +
    "وراجعه مرة أخرى.",
  CHAIN_VERSION_CONFLICT: "غيّر شخص آخر سلسلة الاعتماد. حدّث الصفحة " +
    "وحاول مرة أخرى.",
  CATEGORY_CODE_TAKEN: "يوجد تصنيف مصروفات يستخدم هذا الرمز بالفعل.",
  POLICY_VERSION_CONFLICT: "غيّر شخص آخر سياسة المصروفات. حدّث الصفحة " +
    "وحاول مرة أخرى.",
  CLAIM_NOT_EDITABLE: "لم يعد من الممكن تعديل هذه المطالبة.",
  CLAIM_NOT_CANCELLABLE: "لم يعد من الممكن إلغاء هذه المطالبة.",
  RECEIPT_TOO_LARGE: "حجم الإيصال أكبر من 5 ميغابايت.",
  RECEIPT_TYPE_NOT_ALLOWED: "يجب أن تكون الإيصالات ملفات JPEG أو PNG أو " +
    "PDF.",
  NO_ELIGIBLE_APPROVER: "لا يوجد شخص آخر يمكنه الاعتماد. أضف مالكًا " +
    "آخر أو مستخدم موارد بشرية أو معتمدًا أولًا.",
  CHAIN_INVALID: "سلسلة الاعتماد غير صالحة. راجع المستويات والمعتمدين.",
  RECEIPT_TYPE_MISMATCH: "نوع الملف لا يطابق محتواه.",
  POLICY_INVALID: "سياسة المصروفات غير صالحة. راجع الصفوف المحددة.",
  CANCEL_NOTE_REQUIRED: "أضف ملاحظة لإلغاء مطالبة معتمدة.",
  CLAIM_PROBLEMS: "في المطالبة مشكلات. صحّح البنود المحددة.",
  RECEIPT_QUOTA_EXCEEDED: "رُفع عدد كبير من الإيصالات اليوم. حاول غدًا " +
    "أو اطلب من الموارد البشرية رفع الحد.",
  EXCLUDED_CLAIM_INVALID: "لا يمكن استبعاد إلا المطالبات المعتمدة التي " +
    "تنتظر الدفع من المسير.",
  ...timeErrors,
};
