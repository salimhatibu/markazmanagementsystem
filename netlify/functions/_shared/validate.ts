import { eatDate } from "../../../shared/format";
import { ValidationError } from "./http";

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMISSION = /^[A-Za-z0-9][A-Za-z0-9._\-\/]{0,63}$/;
const CONTROL = /[\u0000-\u001F\u007F]/;
const HEADER_BREAK = /[\r\n\0]/;
const MONEY_TEXT = /^-?\d+(\.\d{1,2})?$/;
const CURRENCY = /^[A-Za-z$.\s]{1,16}$/;

function rejectControl(value: string, field: string): string {
  if (CONTROL.test(value) || HEADER_BREAK.test(value)) {
    throw new ValidationError(`${field} contains invalid characters.`);
  }
  return value;
}

export function requiredText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${field} is required.`);
  }
  const trimmed = rejectControl(value.trim(), field);
  if (trimmed.length > max) throw new ValidationError(`${field} is too long.`);
  return trimmed;
}

export function optionalText(value: unknown, field: string, max: number): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new ValidationError(`${field} is invalid.`);
  const trimmed = rejectControl(value.trim(), field);
  if (!trimmed) return null;
  if (trimmed.length > max) throw new ValidationError(`${field} is too long.`);
  return trimmed;
}

export function optionalEmail(value: unknown, field: string): string | null {
  const email = optionalText(value, field, 255);
  if (!email) return null;
  if (!EMAIL.test(email) || email.includes("..")) {
    throw new ValidationError(`${field} must be an email address.`);
  }
  return email.toLowerCase();
}

export function requiredEmail(value: unknown, field: string): string {
  const email = requiredText(value, field, 255);
  if (!EMAIL.test(email) || email.includes("..")) {
    throw new ValidationError(`${field} must be an email address.`);
  }
  return email.toLowerCase();
}

export function requiredAdmission(value: unknown, field: string): string {
  const admission = requiredText(value, field, 64);
  if (!ADMISSION.test(admission)) {
    throw new ValidationError(`${field} can only use letters, numbers, dots, dashes, or slashes.`);
  }
  return admission;
}

export function requiredPhone(value: unknown, field: string): string {
  const phone = requiredText(value, field, 64);
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 5 || digits.length > 15) {
    throw new ValidationError(`${field} must be a phone number.`);
  }
  if (!/^[+\d][\d\s().-]*$/.test(phone)) {
    throw new ValidationError(`${field} must be a phone number.`);
  }
  return phone;
}

export function optionalPhone(value: unknown, field: string): string | null {
  if (value == null || value === "") return null;
  return requiredPhone(value, field);
}

export function optionalCurrency(value: unknown, field: string): string | null {
  const symbol = optionalText(value, field, 16);
  if (!symbol) return null;
  if (!CURRENCY.test(symbol)) throw new ValidationError(`${field} is invalid.`);
  return symbol;
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
  if (year < 1900) throw new ValidationError(`${field} is too far in the past.`);
  return value;
}

export function parseBirthDate(value: unknown, field: string): string {
  const date = parseDate(value, field);
  const today = eatDate();
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
        ? Number(value.trim())
        : Number.NaN;
  if (typeof value === "string" && value.trim() && !MONEY_TEXT.test(value.trim())) {
    throw new ValidationError(`${field} must be a number with up to two decimal places.`);
  }
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
  if (typeof value === "boolean") return value;
  throw new ValidationError(`${field} must be yes or no.`);
}

export function headerSafe(value: string, fallback = ""): string {
  const cleaned = value.replace(/[\r\n\0]+/g, " ").trim();
  return cleaned || fallback;
}

export function isReportBlobKey(key: string): boolean {
  return (
    /^reports\/(biweekly|monthly)\/\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}-\d+\.pdf$/.test(key) &&
    !key.includes("..") &&
    !key.includes("\\")
  );
}

export function studentFields(body: Record<string, unknown>) {
  return {
    admissionNumber: requiredAdmission(body.admissionNumber, "Admission number"),
    name: requiredText(body.name, "Name", 255),
    dateOfBirth: parseBirthDate(body.dateOfBirth, "Date of birth"),
    gender: oneOf(body.gender, ["male", "female"] as const, "Gender"),
    section: oneOf(body.section, ["morning", "evening"] as const, "Section"),
    expectedFees: parseMoney(body.expectedFees, "Expected fees", true),
    guardianName: requiredText(body.guardianName, "Guardian name", 255),
    guardianPhone: requiredPhone(body.guardianPhone, "Guardian phone"),
    guardianEmail: requiredEmail(body.guardianEmail, "Guardian email"),
    secondContactName: optionalText(body.secondContactName, "Second contact name", 255),
    secondContactPhone: optionalPhone(body.secondContactPhone, "Second contact phone"),
    secondContactEmail: optionalEmail(body.secondContactEmail, "Second contact email"),
  };
}

export function teacherFields(body: Record<string, unknown>) {
  return {
    name: requiredText(body.name, "Name", 255),
    dateOfBirth: parseBirthDate(body.dateOfBirth, "Date of birth"),
    gender: oneOf(body.gender, ["male", "female"] as const, "Gender"),
    expectedSalary: parseMoney(body.expectedSalary, "Expected salary", true),
    expectedReleaseDate: parseDate(body.expectedReleaseDate, "Expected release date"),
    paidInAdvance: parseBoolean(body.paidInAdvance, "Paid in advance"),
    section: oneOf(body.section, ["morning", "evening", "both"] as const, "Section"),
  };
}
