import { eatDate } from "../../shared/format";
import type { Hadith } from "../data/bukhari-nikah";

/** The rotation starts at the first hadith of the chapter on this date and advances one per day. */
export const HADITH_FIRST_DAY = "2026-09-29";
const SEEN_KEY = "markaz_hadith_seen";

export type DailyHadith = {
  hadith: Hadith;
  date: string;
  dayNumber: number;
  total: number;
};

function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
}

/** Shift a YYYY-MM-DD calendar day by a whole number of days (UTC date math). */
export function shiftHadithDate(iso: string, days: number): string {
  const ms = Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000;
  const next = new Date(ms);
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function canBrowseHadithBack(date: string): boolean {
  return daysBetween(HADITH_FIRST_DAY, date) > 0;
}

/** Future days stay closed — only today and earlier readings open. */
export function canBrowseHadithForward(date: string, today = eatDate()): boolean {
  return daysBetween(date, today) > 0;
}

export async function loadDailyHadith(date = eatDate()): Promise<DailyHadith> {
  const today = eatDate();
  const clamped = date > today ? today : date < HADITH_FIRST_DAY ? HADITH_FIRST_DAY : date;
  const { hadiths } = await import("../data/bukhari-nikah");
  const total = hadiths.length;
  const offset = daysBetween(HADITH_FIRST_DAY, clamped);
  const index = ((offset % total) + total) % total;
  return { hadith: hadiths[index], date: clamped, dayNumber: index + 1, total };
}

/** True the first time the app opens on a given East Africa day. */
export function claimFirstVisit(date = eatDate()): boolean {
  if (localStorage.getItem(SEEN_KEY) === date) return false;
  localStorage.setItem(SEEN_KEY, date);
  return true;
}
