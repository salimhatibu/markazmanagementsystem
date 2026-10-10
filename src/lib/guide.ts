export const GUIDE_KEY = "markaz_guide_done";
export const GUIDE_START = "markaz-guide-start";

export type GuideStep = {
  path: string;
  title: string;
  body: string;
  target: string;
};

export const GUIDE_STEPS: GuideStep[] = [
  {
    path: "/",
    title: "Tutorial 101",
    target: "[data-guide=brand]",
    body: "This is the shared ledger for Markaz Imam ash-Shafi'i: students, teachers, classes, money, and the blog, all in one place. There is no separate sign-in per section — anyone with access sees the same books. Amounts are Kenyan shillings. Dates follow East Africa Time. This tour has 20 short stops — skip it any time, or replay it later from Settings.",
  },
  {
    path: "/",
    title: "The home figures",
    target: "[data-guide=figures]",
    body: "Home shows what is in the office today: fees taken in, salaries paid, expenses, and what is still owed. “In the office” is fees minus salaries minus expenses. Outstanding never goes below zero.",
  },
  {
    path: "/",
    title: "Morning and evening, at a glance",
    target: "[data-guide=sections]",
    body: "Below the figures, student and teacher totals are split by section — Tahfeedh in the morning, Taaleem in the evening. A teacher marked “both” counts toward each section's teacher total.",
  },
  {
    path: "/",
    title: "Today’s hadith and your notes",
    target: "[data-guide=hadith-notes], [data-guide=hadith]",
    body: "Each day a short reading from Bukhari sits on the home page. The feather opens a personal notepad on this device. Save a thought, open an older day from the list, or long-press a note to delete it. Notes stay on this device only.",
  },
  {
    path: "/",
    title: "Finding your way",
    target: "[data-guide=nav]",
    body: "The side menu groups everything: Home; People (Students, Classes, Kharajah, Teachers); Miscellaneous (Books, Trips, Expenses, Reports); Papers (Blog); and Office (Settings). On a small phone it folds into the menu button. Near the top, a pill shows who else is on the desk right now and when they were last seen.",
  },
  {
    path: "/",
    title: "A quiet check-in",
    target: "[data-guide=nav]",
    body: "From time to time — up to three times a day — a small pop-up asks how you are feeling. Pick “doing well” or “feeling down”, and a verse meets you where you are. Underneath it you can write how you feel in your own words and save it; every entry is kept with its date and time, and “See your past records” in that same pop-up shows everything you have written before.",
  },
  {
    path: "/students",
    title: "Add a student",
    target: "[data-guide=add-student]",
    body: "Open Students to enrol someone. Fill in section, class time, guardian details, and admission info — and pick a Class if one is already set up. Morning fees are 15,000 a term; evening is 9,000, or 10,000 for Hadhaanah. Search when the list grows.",
  },
  {
    path: "/students",
    title: "Record a fee",
    target: "[data-guide=student-list], [data-guide=add-student]",
    body: "Open a student's record to add a payment: the amount, the date, and the M-Pesa reference. The balance stays open until it is cleared. Overpayment does not create a negative outstanding. The list below groups students by Class.",
  },
  {
    path: "/classes",
    title: "Classes",
    target: "[data-guide=classes-create]",
    body: "Create named teaching groups here, separate from the morning/evening sitting — give a class a name, choose its section, and assign as many teachers to it as actually teach it. Open a class to add or remove students, edit its teachers, or delete it; its students simply become unassigned, never deleted.",
  },
  {
    path: "/kharajah",
    title: "Kharajah",
    target: "[data-guide=kharajah-record]",
    body: "When a student leaves, record it here instead of deleting their record. Their details move off the active Students list and stay on this register with the date and reason they left.",
  },
  {
    path: "/teachers",
    title: "Add a teacher",
    target: "[data-guide=add-teacher]",
    body: "Teachers hold the salary sheet: name, section, phone, national ID, and what they are paid. If the name on M-Pesa differs from the legal name, write both. They appear together on the report.",
  },
  {
    path: "/teachers",
    title: "Pay a salary",
    target: "[data-guide=teacher-list], [data-guide=add-teacher]",
    body: "Open a teacher to record a salary payment. Put the M-Pesa reference in that field and keep the date. Those details print on the monthly report. For each day's late arrival, Ksh 100 is deducted.",
  },
  {
    path: "/books",
    title: "Books",
    target: "[data-guide=books-add]",
    body: "Record a titled list of books bought together — add each title and price, note any stationery cost, and the total is worked out as you go. Saved lists can be linked to an expense.",
  },
  {
    path: "/trips",
    title: "Trips",
    target: "[data-guide=trips-add]",
    body: "Keep a running ledger for a trip or a transport fund — money received and things bought, each with its own date and note. The balance updates as entries are added.",
  },
  {
    path: "/expenses",
    title: "Record an expense",
    target: "[data-guide=add-expense]",
    body: "Expenses are money leaving the office — maintenance, books, food, transport, and the rest. Write the amount, the day, and a short detail. It comes out of what is in the office.",
  },
  {
    path: "/reports",
    title: "Prepare a report",
    target: "[data-guide=save-report], [data-guide=report-views]",
    body: "Reports show the same fees table and salary sheet used on the official papers. Choose this month, last month, or mid-month, pick all sections or just morning or evening, then save a PDF. Download a copy when you need it, or remove one you no longer want.",
  },
  {
    path: "/",
    title: "The paper desk",
    target: "[data-guide=nav-blog]",
    body: "Blog opens its own paper desk for writing. Each post can be saved as a Draft, posted Public (shown on the Read page and in listings), or posted Private — kept off every listing, open only to someone with the direct link. Pick from around thirty fonts for how a piece reads, and paste or drop in pictures — they are resized automatically so the page stays light. Series and Analytics sit in the same desk.",
  },
  {
    path: "/",
    title: "Queries and suggestions",
    target: "[data-guide=feedback]",
    body: "The pencil button in the corner opens a short form for a question or a suggestion. Anyone keeping the books can read and resolve what comes in.",
  },
  {
    path: "/settings",
    title: "Letterhead and bank details",
    target: "[data-guide=settings]",
    body: "Settings hold the short name on the pages and the letterhead printed on every report — address, bank, paybill, and account. Save after you change them.",
  },
  {
    path: "/",
    title: "You are ready",
    target: "[data-guide=help]",
    body: "Walk through this again any time from Settings, or with How to use at the top. The books stay open for everyone. When you are done for the day, just leave the page.",
  },
];

export function hasFinishedGuide(): boolean {
  try {
    return localStorage.getItem(GUIDE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markGuideDone(): void {
  try {
    localStorage.setItem(GUIDE_KEY, "1");
  } catch {
    /* ignore private mode */
  }
}

export function startGuide(): void {
  window.dispatchEvent(new Event(GUIDE_START));
}
