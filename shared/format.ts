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
