import { ValidationError } from "./http";

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requiredText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${field} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) throw new ValidationError(`${field} is too long.`);
  return trimmed;
}

export function optionalText(value: unknown, field: string, max: number): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new ValidationError(`${field} is invalid.`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) throw new ValidationError(`${field} is too long.`);
  return trimmed;
}

export function optionalEmail(value: unknown, field: string): string | null {
  const email = optionalText(value, field, 255);
  if (email && !EMAIL.test(email)) throw new ValidationError(`${field} must be an email address.`);
  return email;
}

export function requiredEmail(value: unknown, field: string): string {
  const email = requiredText(value, field, 255);
  if (!EMAIL.test(email)) throw new ValidationError(`${field} must be an email address.`);
  return email;
}

export function parseDate(value: unknown, field: string): string {
  if (typeof value !== "string") throw new ValidationError(`${field} must be a date.`);
  const match = DATE.exec(value);
  if (!match) throw new ValidationError(`${field} must be a date.`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ValidationError(`${field} must be a date.`);
  }
  return value;
}

export function parseBirthDate(value: unknown, field: string): string {
  const date = parseDate(value, field);
  const now = new Date();
  const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  if (date > today) throw new ValidationError(`${field} cannot be in the future.`);
  return date;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  throw new ValidationError(`${field} is invalid.`);
}

export function parseMoney(value: unknown, field: string, allowZero: boolean): string {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(amount)) throw new ValidationError(`${field} must be a number.`);
  if (amount < 0 || (!allowZero && amount === 0)) {
    throw new ValidationError(
      allowZero ? `${field} must be zero or greater.` : `${field} must be greater than zero.`,
    );
  }
  const rounded = Math.round(amount * 100) / 100;
  if (rounded > 9_999_999_999.99) throw new ValidationError(`${field} is too large.`);
  return rounded.toFixed(2);
}

export function parseBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new ValidationError(`${field} must be yes or no.`);
  return value;
}
