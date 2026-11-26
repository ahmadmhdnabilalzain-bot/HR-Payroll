/*
 * TEMP: fictional roster for the local stub. Delete with stub.ts when
 * `@payroll/demo-data` lands. Every person is invented. Arabic names
 * NEED NATIVE REVIEW.
 */
import type { Localized } from "./types";

export type DeptCode = "exec" | "retail" | "treasury" | "risk" | "ops" |
  "fin" | "people" | "tech";

export const DEPARTMENTS: Record<DeptCode, Localized> = {
  exec: { en: "Executive office", ar: "المكتب التنفيذي" },
  retail: { en: "Retail banking", ar: "الخدمات المصرفية للأفراد" },
  treasury: { en: "Treasury", ar: "الخزينة" },
  risk: { en: "Risk and control", ar: "المخاطر والرقابة" },
  ops: { en: "Operations", ar: "العمليات" },
  fin: { en: "Finance", ar: "المالية" },
  people: { en: "People and admin", ar: "الموارد البشرية والإدارة" },
  tech: { en: "Technology", ar: "التقنية" },
};

/** id, name, Arabic name, dept, role, UAE national, basic, housing. */
export type RosterRow = readonly [string, string, string | null, DeptCode,
  string, boolean, number, number];

export const ROSTER: readonly RosterRow[] = [
  ["e01", "Khalid Al Nuaimi", "خالد النعيمي", "exec", "General manager",
    true, 48000, 18000],
  ["e02", "Layla Haddad", null, "exec", "Executive assistant", false,
    9000, 4000],
  ["e03", "Mariam Al Suwaidi", "مريم السويدي", "retail",
    "Head of retail", true, 32000, 12000],
  ["e04", "Arjun Menon", null, "retail", "Relationship manager", false,
    16000, 6000],
  ["e05", "Sara Khoury", null, "retail", "Relationship manager", false,
    15500, 6000],
  ["e06", "Hamad Al Kaabi", "حمد الكعبي", "retail", "Branch officer",
    true, 14000, 6000],
  ["e07", "Grace Okafor", null, "retail", "Customer service officer",
    false, 8500, 3500],
  ["e08", "Yousef Darwish", null, "retail", "Customer service officer",
    false, 8500, 3500],
  ["e09", "Nadia Rahman", null, "retail", "Teller", false, 7000, 3000],
  ["e10", "Karim Mansour", null, "retail", "Teller", false, 7000, 3000],
  ["e11", "Omar Siddiqui", null, "treasury", "Treasury dealer", false,
    22000, 8000],
  ["e12", "Fatima Al Hosani", "فاطمة الحوسني", "treasury",
    "Head of treasury", true, 36000, 14000],
  ["e13", "Daniel Weber", null, "treasury", "Liquidity analyst", false,
    18000, 7000],
  ["e14", "Priya Nair", null, "treasury", "Back office officer", false,
    11000, 4500],
  ["e15", "Saeed Al Mansoori", "سعيد المنصوري", "risk",
    "Chief risk officer", true, 38000, 14000],
  ["e16", "Elena Petrova", null, "risk", "Credit risk analyst", false,
    17000, 6500],
  ["e17", "Tariq Aziz", null, "risk", "AML analyst", false, 15000, 6000],
  ["e18", "Hannah Clarke", null, "risk", "Internal auditor", false,
    16500, 6500],
  ["e19", "Joseph Mathew", null, "ops", "Operations manager", false,
    21000, 8000],
  ["e20", "Rania Aboud", null, "ops", "Payments officer", false, 10500,
    4000],
  ["e21", "Vikram Singh", null, "ops", "Trade finance officer", false,
    12500, 5000],
  ["e22", "Lina Farouk", null, "ops", "Clearing officer", false, 9500,
    4000],
  ["e23", "Ahmed Saleh", null, "ops", "Records clerk", false, 6500, 2500],
  ["e24", "Noura Al Shamsi", "نورة الشامسي", "fin", "Finance manager",
    true, 30000, 11000],
  ["e25", "Michael Brennan", null, "fin", "Financial controller", false,
    24000, 9000],
  ["e26", "Reem Abdallah", null, "fin", "Accountant", false, 11500, 4500],
  ["e27", "Aisha Al Mazrouei", "عائشة المزروعي", "people", "HR manager",
    true, 26000, 10000],
  ["e28", "Sanjay Kapoor", null, "people", "PRO and admin officer", false,
    9000, 3500],
  ["e29", "Chen Wei", null, "tech", "IT manager", false, 25000, 9000],
  ["e30", "Mohammed Ibrahim", null, "tech", "Systems engineer", false,
    15000, 6000],
];

/** Monthly transport allowance in AED for everyone (demo policy). */
export const TRANSPORT_AED = 1500;

/** Role names in Arabic, keyed by the English role. */
export const ROLE_AR: Record<string, string> = {
  "General manager": "المدير العام",
  "Executive assistant": "مساعدة تنفيذية",
  "Head of retail": "رئيسة الخدمات المصرفية للأفراد",
  "Relationship manager": "مدير علاقات",
  "Branch officer": "موظف فرع",
  "Customer service officer": "موظف خدمة العملاء",
  "Teller": "صراف",
  "Treasury dealer": "متداول خزينة",
  "Head of treasury": "رئيسة الخزينة",
  "Liquidity analyst": "محلل سيولة",
  "Back office officer": "موظفة المكتب الخلفي",
  "Chief risk officer": "رئيس المخاطر",
  "Credit risk analyst": "محللة مخاطر ائتمان",
  "AML analyst": "محلل مكافحة غسل الأموال",
  "Internal auditor": "مدققة داخلية",
  "Operations manager": "مدير العمليات",
  "Payments officer": "موظفة مدفوعات",
  "Trade finance officer": "موظف تمويل تجاري",
  "Clearing officer": "موظفة مقاصة",
  "Records clerk": "كاتب سجلات",
  "Finance manager": "مديرة المالية",
  "Financial controller": "المراقب المالي",
  "Accountant": "محاسبة",
  "HR manager": "مديرة الموارد البشرية",
  "PRO and admin officer": "مندوب علاقات حكومية وإداري",
  "IT manager": "مدير تقنية المعلومات",
  "Systems engineer": "مهندس أنظمة",
};
