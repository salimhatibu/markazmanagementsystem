import { eatParts } from "./format";

export type DateRange = {
  start: string;
  end: string;
};

function iso(year: number, monthIndex: number, day: number): string {
  const month = String(monthIndex + 1).padStart(2, "0");
  const date = String(day).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

/** Most recently completed half-month in East Africa Time. */
export function biweeklyRange(now: Date): DateRange {
  const eat = eatParts(now);
  const day = eat.day;
  const year = eat.year;
  const month = eat.month - 1;

  if (day >= 15) {
    return { start: iso(year, month, 1), end: iso(year, month, 14) };
  }

  const lastOfPrevious = new Date(Date.UTC(year, month, 0));
  return {
    start: iso(lastOfPrevious.getUTCFullYear(), lastOfPrevious.getUTCMonth(), 16),
    end: iso(
      lastOfPrevious.getUTCFullYear(),
      lastOfPrevious.getUTCMonth(),
      lastOfPrevious.getUTCDate(),
    ),
  };
}

/** Previous calendar month in East Africa Time. */
export function monthlyRange(now: Date): DateRange {
  const eat = eatParts(now);
  const lastOfPrevious = new Date(Date.UTC(eat.year, eat.month - 1, 0));
  return {
    start: iso(lastOfPrevious.getUTCFullYear(), lastOfPrevious.getUTCMonth(), 1),
    end: iso(
      lastOfPrevious.getUTCFullYear(),
      lastOfPrevious.getUTCMonth(),
      lastOfPrevious.getUTCDate(),
    ),
  };
}

export function rangeFor(period: "biweekly" | "monthly", now: Date): DateRange {
  return period === "biweekly" ? biweeklyRange(now) : monthlyRange(now);
}
