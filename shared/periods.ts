export type DateRange = {
  start: string;
  end: string;
};

function iso(year: number, monthIndex: number, day: number): string {
  const month = String(monthIndex + 1).padStart(2, "0");
  const date = String(day).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

/** Most recently completed half-month in UTC. Used by the 1st/15th schedule and manual generate. */
export function biweeklyRange(now: Date): DateRange {
  const day = now.getUTCDate();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

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

/** Previous calendar month in UTC. */
export function monthlyRange(now: Date): DateRange {
  const lastOfPrevious = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
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
