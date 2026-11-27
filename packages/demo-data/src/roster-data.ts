import type { CaseTag, DeptCode, Gender } from "./types";

/**
 * FICTIONAL staff of a FICTIONAL Abu Dhabi bank. Names are common
 * first and family names put together for the demo; any match with a
 * real person is chance. Arabic names: NEEDS NATIVE REVIEW.
 */
export interface StaffSeed { name: string; nameAr: string | null;
  nationality: string; birthYear: number; dept: DeptCode; job: string;
  grade: number; location: string; tag?: CaseTag }

const s = (name: string, nameAr: string | null, nationality: string,
  birthYear: number, dept: DeptCode, job: string, grade: number,
  location: string, tag?: CaseTag): StaffSeed => ({ name, nameAr,
  nationality, birthYear, dept, job, grade, location,
  ...(tag === undefined ? {} : { tag }) });

export const HQ = "hq-abu-dhabi";
export const KHALIDIYA = "br-khalidiya";
export const AL_AIN = "br-al-ain";
export const LOCATIONS = [HQ, KHALIDIYA, AL_AIN] as const;

export const STAFF: readonly StaffSeed[] = [
  s("Khalid Al Nuaimi", "خالد النعيمي", "AE", 1971, "exec",
    "general-manager", 10, HQ),
  s("Sara Haddad", "سارة حداد", "JO", 1990, "exec",
    "executive-assistant", 3, HQ),
  s("Mariam Al Suwaidi", "مريم السويدي", "AE", 1985, "retail",
    "branch-manager", 7, KHALIDIYA),
  s("Hamdan Al Dhaheri", "حمدان الظاهري", "AE", 1988, "retail",
    "branch-manager", 7, AL_AIN),
  s("Maria Santos", null, "PH", 1992, "retail",
    "customer-service-officer", 3, KHALIDIYA, "unpaid-leave"),
  s("Noora Al Shamsi", "نورة الشامسي", "AE", 1996, "retail",
    "customer-service-officer", 3, AL_AIN),
  s("Ayesha Siddiqui", null, "PK", 1995, "retail", "teller", 2,
    KHALIDIYA, "loan-over-cap"),
  s("Saeed Al Mazrouei", "سعيد المزروعي", "AE", 1998, "retail",
    "teller", 2, KHALIDIYA),
  s("Kavya Iyer", null, "IN", 1997, "retail", "teller", 1, AL_AIN,
    "probation"),
  s("Moza Al Kaabi", "موزة الكعبي", "AE", 1999, "retail", "teller", 1,
    AL_AIN),
  s("Rashid Al Falasi", "راشد الفلاسي", "AE", 1980, "corp",
    "head-of-corporate", 9, HQ),
  s("Omar Farouk", "عمر فاروق", "EG", 1984, "corp",
    "relationship-manager", 7, HQ, "back-pay"),
  s("Aisha Al Marri", "عائشة المري", "AE", 1990, "corp",
    "relationship-manager", 7, HQ),
  s("James Whitfield", null, "GB", 1982, "corp", "relationship-manager",
    7, HQ, "leaver"),
  s("Latifa Al Hammadi", "لطيفة الحمادي", "AE", 1994, "corp",
    "relationship-officer", 5, HQ),
  s("Arjun Menon", null, "IN", 1983, "ops", "operations-manager", 7, HQ),
  s("Jose Reyes", null, "PH", 1989, "ops", "payments-officer", 3, HQ,
    "overtime"),
  s("Rafiq Hossain", null, "BD", 1991, "ops", "payments-officer", 3, HQ),
  s("Shamma Al Zaabi", "شما الزعابي", "AE", 1997, "ops",
    "operations-officer", 3, HQ),
  s("Nimal Perera", null, "LK", 1987, "ops", "archive-clerk", 1, HQ),
  s("Lina Khoury", "لينا خوري", "LB", 1986, "credit",
    "credit-risk-manager", 8, HQ),
  s("Majid Al Ketbi", "ماجد الكتبي", "AE", 1992, "credit",
    "credit-analyst", 5, HQ),
  s("Priya Nair", null, "IN", 1993, "credit", "credit-analyst", 5, HQ,
    "missing-iban"),
  s("Hessa Al Mheiri", "حصة المهيري", "AE", 1989, "compliance",
    "compliance-officer", 6, HQ),
  s("Youssef Adel", "يوسف عادل", "EG", 1991, "compliance",
    "aml-analyst", 5, HQ),
  s("Karim Saade", "كريم سعادة", "LB", 1983, "fin", "finance-manager",
    8, HQ),
  s("Juma Al Zaabi", "جمعة الزعابي", "AE", 1994, "fin", "accountant", 4,
    HQ, "iban-typo"),
  s("Fatima Al Ketbi", "فاطمة الكتبي", "AE", 1986, "hr", "hr-manager",
    8, HQ),
  s("Grace Wanjiru", null, "KE", 1994, "hr", "hr-officer", 4, HQ),
  s("Vikram Rao", null, "IN", 1984, "it", "it-manager", 8, HQ,
    "night-overtime"),
  s("Emily Carter", null, "GB", 1993, "it", "systems-engineer", 5, HQ),
];

/**
 * Gender as on each (fictional) file, by name, so the roster stays
 * one line a person. Every name is in exactly one list (a test
 * checks), so nobody is a man by omission.
 */
export const FEMALE: readonly string[] = ["Sara Haddad",
  "Mariam Al Suwaidi", "Maria Santos", "Noora Al Shamsi",
  "Ayesha Siddiqui", "Kavya Iyer", "Moza Al Kaabi", "Aisha Al Marri",
  "Latifa Al Hammadi", "Shamma Al Zaabi", "Lina Khoury", "Priya Nair",
  "Hessa Al Mheiri", "Fatima Al Ketbi", "Grace Wanjiru", "Emily Carter"];
export const MALE: readonly string[] = ["Khalid Al Nuaimi",
  "Hamdan Al Dhaheri", "Saeed Al Mazrouei", "Rashid Al Falasi",
  "Omar Farouk", "James Whitfield", "Arjun Menon", "Jose Reyes",
  "Rafiq Hossain", "Nimal Perera", "Majid Al Ketbi", "Youssef Adel",
  "Karim Saade", "Juma Al Zaabi", "Vikram Rao"];

/** The person's gender; a name in neither list is an error. */
export function genderOf(name: string): Gender {
  if (FEMALE.includes(name)) return "female";
  if (MALE.includes(name)) return "male";
  throw new Error(`no gender on file for ${name}`);
}

export const DEPT_CODES: readonly DeptCode[] = ["exec", "retail", "corp",
  "ops", "credit", "compliance", "fin", "hr", "it"];

/** Basic salary band floor in fils by grade (AED 4,500 to 65,000). */
export const GRADE_BASIC: Record<number, bigint> = {
  1: 450000n, 2: 600000n, 3: 800000n, 4: 1100000n, 5: 1500000n,
  6: 2000000n, 7: 2700000n, 8: 3600000n, 9: 4800000n, 10: 6500000n };
/** Transport allowance in fils by grade. */
export const GRADE_TRANSPORT: Record<number, bigint> = {
  1: 60000n, 2: 80000n, 3: 100000n, 4: 120000n, 5: 150000n,
  6: 200000n, 7: 250000n, 8: 300000n, 9: 350000n, 10: 400000n };
/** One seeded step inside a band: AED 250 (0 to 8 steps). */
export const BASIC_STEP = 25000n;
