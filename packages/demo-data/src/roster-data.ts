import type { DeptCode } from "./types";

/**
 * Fictional people. Names are common first and family names put
 * together for the demo; any match with a real person is chance.
 * Arabic names: NEEDS NATIVE REVIEW.
 */
export interface PersonSeed { name: string; nameAr: string | null;
  nationality: string; birthYear: number }

const p = (name: string, nationality: string, birthYear: number,
  nameAr: string | null = null): PersonSeed =>
  ({ name, nameAr, nationality, birthYear });

export const PEOPLE: readonly PersonSeed[] = [
  p("Mariam Al Suwaidi", "AE", 1991, "مريم السويدي"),
  p("Khalid Al Nuaimi", "AE", 1987, "خالد النعيمي"),
  p("Fatima Al Ketbi", "AE", 1995, "فاطمة الكتبي"),
  p("Saeed Al Mazrouei", "AE", 1989, "سعيد المزروعي"),
  p("Noora Al Shamsi", "AE", 1997, "نورة الشامسي"),
  p("Hamdan Al Dhaheri", "AE", 1985, "حمدان الظاهري"),
  p("Aisha Al Marri", "AE", 1993, "عائشة المري"),
  p("Rashid Al Falasi", "AE", 1990, "راشد الفلاسي"),
  p("Priya Nair", "IN", 1990), p("Arjun Menon", "IN", 1986),
  p("Kavya Iyer", "IN", 1994), p("Rahul Verma", "IN", 1988),
  p("Sneha Pillai", "IN", 1992), p("Vikram Rao", "IN", 1983),
  p("Anjali Desai", "IN", 1996), p("Rohan Kapoor", "IN", 1991),
  p("Divya Kurian", "IN", 1989), p("Sanjay Gupta", "IN", 1980),
  p("Ayesha Siddiqui", "PK", 1993), p("Bilal Qureshi", "PK", 1987),
  p("Usman Tariq", "PK", 1990), p("Sana Javed", "PK", 1995),
  p("Imran Butt", "PK", 1984),
  p("Maria Santos", "PH", 1992), p("Jose Reyes", "PH", 1988),
  p("Angelica Cruz", "PH", 1996), p("Mark Bautista", "PH", 1990),
  p("Kristine Dela Rosa", "PH", 1994), p("Paolo Mendoza", "PH", 1986),
  p("Omar Farouk", "EG", 1985, "عمر فاروق"),
  p("Nour Hassan", "EG", 1993, "نور حسن"),
  p("Youssef Adel", "EG", 1989, "يوسف عادل"),
  p("Salma Fathy", "EG", 1997, "سلمى فتحي"),
  p("Lina Haddad", "JO", 1991, "لينا حداد"),
  p("Tariq Nasser", "JO", 1984, "طارق ناصر"),
  p("Rania Khoury", "JO", 1990, "رانيا خوري"),
  p("Emily Carter", "GB", 1988), p("James Whitfield", "GB", 1979),
  p("Sophie Lambert", "GB", 1993),
  p("Karim Saade", "LB", 1987, "كريم سعادة"),
  p("Maya Azar", "LB", 1995, "مايا عازار"),
  p("Rafiq Hossain", "BD", 1989), p("Nasrin Akter", "BD", 1994),
  p("Grace Wanjiru", "KE", 1992), p("Daniel Otieno", "KE", 1988),
  p("Suman Thapa", "NP", 1991),
  p("Nimal Perera", "LK", 1986), p("Dilani Fernando", "LK", 1995),
];

export const DEPT_CODES: readonly DeptCode[] =
  ["fin", "ops", "sal", "eng", "ppl", "cs"];

/** Eight posts per department: job key and grade 1 (entry) to 5. */
export const POSTS: Record<DeptCode, readonly [string, number][]> = {
  fin: [["finance-manager", 5], ["senior-accountant", 4],
    ["accountant", 3], ["accountant", 3], ["payroll-officer", 3],
    ["ap-clerk", 2], ["ar-clerk", 2], ["office-assistant", 1]],
  ops: [["operations-manager", 5], ["logistics-lead", 4],
    ["planner", 3], ["warehouse-supervisor", 3], ["driver", 1],
    ["driver", 1], ["storekeeper", 2], ["storekeeper", 2]],
  sal: [["sales-director", 5], ["account-manager", 4],
    ["account-manager", 4], ["sales-executive", 3],
    ["sales-executive", 3], ["sales-coordinator", 2],
    ["sales-coordinator", 2], ["receptionist", 1]],
  eng: [["engineering-lead", 5], ["senior-engineer", 4],
    ["senior-engineer", 4], ["engineer", 3], ["engineer", 3],
    ["engineer", 3], ["qa-analyst", 3], ["it-support", 2]],
  ppl: [["hr-manager", 5], ["hr-generalist", 3], ["recruiter", 3],
    ["pro-officer", 2], ["hr-assistant", 2], ["admin-officer", 2],
    ["admin-officer", 2], ["office-assistant", 1]],
  cs: [["service-manager", 4], ["team-leader", 3], ["team-leader", 3],
    ["service-agent", 2], ["service-agent", 2], ["service-agent", 2],
    ["service-agent", 1], ["service-agent", 1]],
};

/** Basic salary in fils by grade, before the seeded step. */
export const GRADE_BASIC: Record<number, bigint> = {
  1: 350000n, 2: 600000n, 3: 1000000n, 4: 1500000n, 5: 2400000n };
/** Transport allowance in fils by grade. */
export const GRADE_TRANSPORT: Record<number, bigint> = {
  1: 50000n, 2: 80000n, 3: 100000n, 4: 150000n, 5: 200000n };
/** One seeded step of basic salary: AED 250. */
export const BASIC_STEP = 25000n;
