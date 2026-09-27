export const OFFICIAL_NAME = "MARKAZ AL-IMAAM ASH-SHAAFI'IY AL-ISLAAMIY";
export const OFFICIAL_ADDRESS = "P.O. Box 3011-80100 Mombasa, Kenya.";
export const ACCOUNT_NAME = "AHLUL ATHAR REGISTERED TRUSTEES";
export const BANK_NAME = "GULF AFRICAN BANK";
export const PAYBILL = "985050";
export const ACCOUNT_NUMBER = "0700004102";
export const LATE_ARRIVAL_DEDUCTION = 100;
export const BOOKS_NOTE = "Books are sold at the madrasa and paid cash to the madrasah.";
export const CHANGES_NOTE = "Any changes shall be notified.";
export const BLESSING = "BAARAKA ALLAAHU FEEKUM.";
export const PAYMENT_LEAD = "Fees and admission are paid to the bank through the following account:";

export type Letterhead = {
  markazName: string;
  address: string;
  accountName: string;
  bankName: string;
  paybill: string;
  accountNumber: string;
};

export type FeeInstallment = {
  label: string;
  amount: number;
};

export type DressRow = {
  who: string;
  dress: string;
  price?: number;
};

export type SectionFees = {
  key: "morning" | "evening";
  title: string;
  yearNote: string;
  feePerTerm: number;
  admission: number;
  extraNote?: string;
  installments: FeeInstallment[];
  clearance?: string;
  schedule: string[];
  holidays: string[];
};

export const TERMS = [
  { name: "First term", months: "January – June" },
  { name: "Second term", months: "July – December" },
] as const;

export const BOYS_SECTION_NOTE =
  "In the girls’ section, boys are admitted from age 3.5 / 4 to age 7. Above that age they are transferred to the boys’ section.";

export const DRESS_CODE: DressRow[] = [
  {
    who: "Boys",
    dress: "A white kanzu with long pants and a cap (kofia), white socks and black shoes.",
  },
  {
    who: "Girls 3.5 to 5 years",
    dress: "Mustard yellow dress, a white hijaab and white long pants, white socks and black closed shoes.",
    price: 1050,
  },
  {
    who: "Girls 6 to 8 years",
    dress: "Mustard yellow dress, a white hijaab and white long pants, white socks and black closed shoes.",
    price: 1250,
  },
  {
    who: "Girls 9 to 10 years",
    dress:
      "Mustard yellow dress, a white hijaab and white long pants, white socks and black closed shoes. They should wear a black abaya and take it off in class until home time.",
    price: 1450,
  },
  {
    who: "Girls 11 years",
    dress: "A black overhead abaya (abaayatu-ra’s) / black jilbab and black plain abaya, black socks and black closed shoes.",
  },
  {
    who: "Girls 12 years and above",
    dress: "A black overhead abaya (abaayatu-ra’s) with black niqaab, socks, gloves and black closed shoes.",
  },
];

export const MORNING_FEES: SectionFees = {
  key: "morning",
  title: "Morning / day section",
  yearNote: "One academic year consists of two terms of six months each.",
  feePerTerm: 15000,
  admission: 3000,
  installments: [
    { label: "One installment", amount: 15000 },
    { label: "Two installments", amount: 7500 },
  ],
  clearance: "Fees should be cleared one month before the term ends.",
  schedule: [
    "Monday – Friday: 7:00am – 1:20pm (after Dhuhr).",
    "No classes in the afternoons.",
    "No classes on Saturdays and Sundays.",
  ],
  holidays: [
    "The last 10 days of Ramadhaan together with the Eid and 6 days of Shawwaal.",
    "1 week of Eid al-Adha.",
    "The last 2 weeks of December.",
  ],
};

export const EVENING_FEES: SectionFees = {
  key: "evening",
  title: "Evening section",
  yearNote:
    "One academic year consists of two terms of six months each. Fees per term are KES 9,000 except Hadhaanah (baby class), which is KES 10,000.",
  feePerTerm: 9000,
  admission: 1500,
  extraNote: "We do not admit students who come on Sundays only. Classes go on during public holidays.",
  installments: [
    { label: "One installment", amount: 9000 },
    { label: "Two installments", amount: 4500 },
    { label: "Three installments", amount: 3000 },
  ],
  schedule: [
    "When schools are open (5 days): Monday–Wednesday 3:00pm–6:00pm; Saturday–Sunday 7:30am–1:20pm. No afternoon classes on weekends.",
    "When schools are closed (6 days): Monday–Thursday 2:00pm–6:00pm; Saturday–Sunday 7:30am–1:20pm. No afternoon classes on weekends.",
  ],
  holidays: [
    "The whole month of Ramadhaan together with the Eid and 6 days of Shawwaal.",
    "1 week of Eid al-Adha.",
    "The last 2 weeks of December.",
  ],
};

export const SECTION_FEES = [MORNING_FEES, EVENING_FEES] as const;

export function presentLetterhead(row?: {
  address?: string | null;
  accountName?: string | null;
  bankName?: string | null;
  paybill?: string | null;
  accountNumber?: string | null;
} | null): Letterhead {
  return {
    markazName: OFFICIAL_NAME,
    address: row?.address?.trim() || OFFICIAL_ADDRESS,
    accountName: row?.accountName?.trim() || ACCOUNT_NAME,
    bankName: row?.bankName?.trim() || BANK_NAME,
    paybill: row?.paybill?.trim() || PAYBILL,
    accountNumber: row?.accountNumber?.trim() || ACCOUNT_NUMBER,
  };
}

export function applicantName(name: string, mpesaName?: string | null): string {
  const legal = name.trim();
  const registered = mpesaName?.trim() || "";
  if (registered && registered.toLowerCase() !== legal.toLowerCase()) {
    return `${legal} (${registered})`;
  }
  return legal || registered || "—";
}

export function payoutPhone(phone?: string | null, mpesaNumber?: string | null): string {
  return mpesaNumber?.trim() || phone?.trim() || "";
}
