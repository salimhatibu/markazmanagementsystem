export const MARKAZ_NAME = "markaz";
export const CURRENCY = "KES";
export const TIME_ZONE = "Africa/Nairobi";

export function eatParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const hour = read("hour");
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: hour === 24 ? 0 : hour,
    minute: read("minute"),
  };
}

export function eatDate(date = new Date()): string {
  const { year, month, day } = eatParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatEat(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const { year, month, day, hour, minute } = eatParts(date);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)} EAT`;
}

/** Notebook-style date, such as 27/9/26. */
export function formatShortDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${Number(match[3])}/${Number(match[2])}/${match[1].slice(2)}`;
}

export function monthName(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return "";
  return new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)),
  );
}

export function ageFromDob(dateOfBirth: string, today = new Date()): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) return 0;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const current = eatParts(today);
  let age = current.year - year;
  if (current.month < month || (current.month === month && current.day < day)) {
    age -= 1;
  }
  return age;
}

export function formatMoney(amount: number, symbol: string | null | undefined): string {
  const formatted = amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = symbol?.trim() || CURRENCY;
  return `${prefix} ${formatted}`;
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString("en-GB", { maximumFractionDigits: 1 })}%`;
}

export function label(value: string): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function asIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  if (value.includes("T")) return value;
  return `${value.replace(" ", "T")}Z`;
}

export function displayName(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? "";
  return trimmed || MARKAZ_NAME;
}

export type HijriDate = {
  day: number;
  month: string;
  year: number;
  english: string;
  arabic: string;
};

const HIJRI_MONTHS_EN = [
  "Muharram",
  "Safar",
  "Rabiʻ I",
  "Rabiʻ II",
  "Jumada I",
  "Jumada II",
  "Rajab",
  "Shaʻban",
  "Ramadan",
  "Shawwal",
  "Dhul-Qaʻdah",
  "Dhul-Hijjah",
] as const;

const HIJRI_MONTHS_AR = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
] as const;

const HIJRI_CALENDARS = ["islamic-umalqura", "islamic-rgsa", "islamic-civil", "islamic"] as const;

function hijriDigits(value: number): string {
  return String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)] ?? digit);
}

function hijriPartsFrom(date: Date, calendar: string): { day: number; month: number; year: number } | null {
  try {
    const parts = new Intl.DateTimeFormat(`en-u-ca-${calendar}`, {
      timeZone: TIME_ZONE,
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).formatToParts(date);
    const read = (type: Intl.DateTimeFormatPartTypes) =>
      Number((parts.find((part) => part.type === type)?.value ?? "").replace(/\D/g, ""));
    const day = read("day");
    const month = read("month");
    const year = read("year");
    if (day >= 1 && day <= 30 && month >= 1 && month <= 12 && year >= 1300 && year < 2000) {
      return { day, month, year };
    }
  } catch {
    /* engine missing this calendar */
  }
  return null;
}

function hijriParts(date: Date): { day: number; month: number; year: number } {
  for (const calendar of HIJRI_CALENDARS) {
    const parts = hijriPartsFrom(date, calendar);
    if (parts) return parts;
  }
  return { day: 1, month: 1, year: 1448 };
}

export function hijriDate(date = new Date()): HijriDate {
  const { day, month, year } = hijriParts(date);
  const monthNameEn = HIJRI_MONTHS_EN[month - 1] ?? HIJRI_MONTHS_EN[0];
  const monthNameAr = HIJRI_MONTHS_AR[month - 1] ?? HIJRI_MONTHS_AR[0];
  return {
    day,
    month: monthNameEn,
    year,
    english: `${day} ${monthNameEn} ${year} AH`,
    arabic: `${hijriDigits(day)} ${monthNameAr} ${hijriDigits(year)} هـ`,
  };
}
