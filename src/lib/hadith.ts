import { eatDate } from "../../shared/format";
import type { Hadith } from "../data/bukhari-nikah";

/** The rotation starts at the first hadith of the chapter on this date and advances one per day. */
const FIRST_DAY = "2026-09-29";
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

export async function loadDailyHadith(date = eatDate()): Promise<DailyHadith> {
  const { hadiths } = await import("../data/bukhari-nikah");
  const total = hadiths.length;
  const offset = daysBetween(FIRST_DAY, date);
  const index = ((offset % total) + total) % total;
  return { hadith: hadiths[index], date, dayNumber: index + 1, total };
}

/** True the first time the app opens on a given East Africa day. */
export function claimFirstVisit(date = eatDate()): boolean {
  if (localStorage.getItem(SEEN_KEY) === date) return false;
  localStorage.setItem(SEEN_KEY, date);
  return true;
}
