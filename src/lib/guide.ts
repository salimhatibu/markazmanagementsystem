export const GUIDE_KEY = "markaz_guide_done";
export const GUIDE_START = "markaz-guide-start";

export type GuideStep = {
  path: string;
  title: string;
  body: string;
};

export const GUIDE_STEPS: GuideStep[] = [
  {
    path: "/",
    title: "Welcome to the books",
    body: "This is the shared ledger for Markaz Imam ash-Shafi'i. There is no sign-in. Anyone with the link opens the same students, teachers, and money. Amounts are Kenyan shillings. Dates follow East Africa Time.",
  },
  {
    path: "/",
    title: "The home figures",
    body: "Home shows what is in the office today: fees taken in, salaries paid, expenses, and what is still owed. “In the office” is fees minus salaries minus expenses. Outstanding never goes below zero.",
  },
  {
    path: "/",
    title: "Today’s hadith and your notes",
    body: "Each day a short reading from Bukhari sits on the home page. The feather opens a personal notepad on this phone. Save a thought, open an older day from the list, or long-press a note to delete it. Notes stay on this device only.",
  },
  {
    path: "/",
    title: "Finding your way",
    body: "The top bar takes you through Home, Students, Teachers, Expenses, Reports, and Settings. On a small phone the links fold into the menu button. The round switch changes the light and dark page.",
  },
  {
    path: "/students",
    title: "Add a student",
    body: "Open Students to enrol someone. Use Add a student and fill section, guardian, and admission details. Morning fees are 15,000 a term; evening is 9,000, or 10,000 for Hadhaanah. Search when the list grows.",
  },
  {
    path: "/students",
    title: "Record a fee",
    body: "Tap a student’s name to open their record. Add payment with the amount, the date, and the M-Pesa reference. The balance stays open until it is cleared. Overpayment does not create a negative outstanding.",
  },
  {
    path: "/teachers",
    title: "Add a teacher",
    body: "Teachers hold the salary sheet: name, phone, national ID, and what they are paid. If the name on M-Pesa differs from the legal name, write both. They appear together on the report.",
  },
  {
    path: "/teachers",
    title: "Pay a salary",
    body: "Open a teacher to record a salary payment. Put the M-Pesa reference in that field and keep the date. Those details print on the monthly report. For each day’s late arrival, Ksh 100 is deducted.",
  },
  {
    path: "/expenses",
    title: "Record an expense",
    body: "Expenses are money leaving the office — maintenance, books, food, transport, and the rest. Write the amount, the day, and a short detail. It comes out of what is in the office.",
  },
  {
    path: "/reports",
    title: "Prepare a report",
    body: "Reports show the same fees table and salary sheet used on the official papers. Choose this month, last month, or mid-month, then save a PDF. Download a copy when you need it, or remove one you no longer want.",
  },
  {
    path: "/settings",
    title: "Letterhead and bank details",
    body: "Settings hold the short name on the pages and the letterhead printed on every report — address, bank, paybill, and account. Save after you change them.",
  },
  {
    path: "/",
    title: "You are ready",
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
