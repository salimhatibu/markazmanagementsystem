export function ageFromDob(dateOfBirth: string, today = new Date()): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) return 0;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  let age = today.getFullYear() - year;
  const currentMonth = today.getMonth() + 1;
  if (currentMonth < month || (currentMonth === month && today.getDate() < day)) {
    age -= 1;
  }
  return age;
}

export function formatMoney(amount: number, symbol: string | null | undefined): string {
  const formatted = amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = symbol?.trim() ?? "";
  return prefix ? `${prefix}${formatted}` : formatted;
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
  return trimmed || "Markaz";
}
