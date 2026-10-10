import { eatDate } from "../../shared/format";
import { ValidationError } from "./http";

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMISSION = /^[A-Za-z0-9][A-Za-z0-9._\-\/]{0,63}$/;
const CONTROL = /[\u0000-\u001F\u007F]/;
const HEADER_BREAK = /[\r\n\0]/;
const UNSAFE_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
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

function rejectUnsafeControl(value: string, field: string): string {
  if (UNSAFE_CONTROL.test(value)) {
    throw new ValidationError(`${field} contains invalid characters.`);
  }
  return value;
}

/** Like requiredText, but for multi-line free text (messages, notes, reasons) -- allows newlines and tabs. */
export function requiredMessage(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${field} is required.`);
  }
  const trimmed = rejectUnsafeControl(value.replace(/\r\n/g, "\n").trim(), field);
  if (trimmed.length > max) throw new ValidationError(`${field} is too long.`);
  return trimmed;
}

/** Like optionalText, but for multi-line free text (messages, notes, reasons) -- allows newlines and tabs. */
export function optionalMessage(value: unknown, field: string, max: number): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new ValidationError(`${field} is invalid.`);
  const trimmed = rejectUnsafeControl(value.replace(/\r\n/g, "\n").trim(), field);
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
    /^reports\/(biweekly|monthly)\/(?:(?:all|morning|evening)\/)?\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}-\d+\.pdf$/.test(key) &&
    !key.includes("..") &&
    !key.includes("\\")
  );
}

export function parseQuantity(value: unknown, field: string): number {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isInteger(amount) || amount < 1 || amount > 100_000) {
    throw new ValidationError(`${field} must be a whole number of at least 1.`);
  }
  return amount;
}

export function studentFields(body: Record<string, unknown>) {
  const admissionFeeCollected =
    body.admissionFeeCollected === undefined ? false : parseBoolean(body.admissionFeeCollected, "Admission fees collected");
  const admissionFeeAmount = parseMoney(
    body.admissionFeeAmount === undefined || body.admissionFeeAmount === "" ? "0" : body.admissionFeeAmount,
    "Admission fee amount",
    true,
  );
  if (admissionFeeCollected && Number(admissionFeeAmount) <= 0) {
    throw new ValidationError("Enter the admission fee amount that was collected.");
  }
  return {
    admissionNumber: requiredAdmission(body.admissionNumber, "Admission number"),
    name: requiredText(body.name, "Name", 255),
    dateOfBirth: parseBirthDate(body.dateOfBirth, "Date of birth"),
    gender: oneOf(body.gender, ["male", "female"] as const, "Gender"),
    section: oneOf(body.section, ["morning", "evening"] as const, "Section"),
    expectedFees: parseMoney(body.expectedFees, "Expected fees", true),
    admittedOn: parseDate(body.admittedOn ?? body.dateOfAdmission, "Date of admission"),
    admissionFeeCollected,
    admissionFeeAmount,
    guardianName: requiredText(body.guardianName, "Guardian name", 255),
    guardianPhone: requiredPhone(body.guardianPhone, "Guardian phone"),
    guardianEmail: requiredEmail(body.guardianEmail, "Guardian email"),
    secondContactName: optionalText(body.secondContactName, "Second contact name", 255),
    secondContactPhone: optionalPhone(body.secondContactPhone, "Second contact phone"),
    secondContactEmail: optionalEmail(body.secondContactEmail, "Second contact email"),
    classId: optionalClassId(body.classId),
  };
}

function optionalClassId(value: unknown): number | null {
  if (value == null || value === "" || value === 0) return null;
  const id = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ValidationError("Choose a class.");
  return id;
}

export function kharajahLeaveFields(body: Record<string, unknown>) {
  return {
    studentId: (() => {
      const raw = body.studentId;
      const id = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isSafeInteger(id) || id <= 0) throw new ValidationError("Choose a student to record as leaving.");
      return id;
    })(),
    leftOn: parseDate(body.leftOn, "Date of leaving"),
    leaveReason: requiredMessage(body.leaveReason, "Reason for leaving", 2000),
    notes: optionalMessage(body.notes, "Notes", 2000),
  };
}

export function bookPurchaseFields(body: Record<string, unknown>) {
  return {
    name: requiredText(body.name, "Book name", 255),
    unitCost: parseMoney(body.unitCost ?? body.cost, "Cost", false),
    quantity: parseQuantity(body.quantity, "Quantity"),
    purchasedOn: parseDate(body.purchasedOn, "Date of purchase"),
  };
}

export function bookInventoryFields(body: Record<string, unknown>) {
  const title = requiredText(body.title, "List title", 255);
  const purchasedOn = parseDate(body.purchasedOn, "Date of purchase");
  const rawItems = body.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new ValidationError("Add at least one book to the list.");
  }
  if (rawItems.length > 200) throw new ValidationError("That list has too many books.");
  const items = rawItems.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ValidationError(`Book ${index + 1} is invalid.`);
    }
    const row = item as Record<string, unknown>;
    return {
      name: requiredText(row.name, `Book ${index + 1} name`, 255),
      price: parseMoney(row.price, `Book ${index + 1} price`, false),
      sortOrder: index,
    };
  });
  const stationeriesNote = optionalMessage(body.stationeriesNote, "Stationeries", 2000);
  const stationeriesRaw = body.stationeriesCost;
  const stationeriesCost =
    stationeriesRaw == null || stationeriesRaw === ""
      ? null
      : parseMoney(stationeriesRaw, "Stationeries cost", true);
  if (stationeriesNote && (!stationeriesCost || Number(stationeriesCost) <= 0)) {
    throw new ValidationError("Enter the stationeries cost.");
  }
  if (stationeriesCost && Number(stationeriesCost) > 0 && !stationeriesNote) {
    throw new ValidationError("Describe the stationeries for that cost.");
  }
  return { title, purchasedOn, items, stationeriesNote, stationeriesCost };
}

export function feedbackFields(body: Record<string, unknown>) {
  return {
    kind: oneOf(body.kind ?? "query", ["query", "suggestion"] as const, "Kind"),
    body: requiredMessage(body.body, "Message", 4000),
  };
}

export function expenseFields(body: Record<string, unknown>) {
  return {
    reason: requiredText(body.reason, "Reason", 255),
    amount: parseMoney(body.amount, "Amount", false),
    details: optionalMessage(body.details, "Details", 2000),
    spentOn: parseDate(body.spentOn, "Date"),
  };
}

export function tripFields(body: Record<string, unknown>) {
  return {
    title: requiredText(body.title, "Trip title", 255),
    notes: optionalMessage(body.notes, "Notes", 2000),
  };
}

export function tripEntryFields(body: Record<string, unknown>) {
  return {
    description: requiredText(body.description, "Description", 255),
    quantity: optionalText(body.quantity, "Quantity", 64),
    amount: parseMoney(body.amount, "Amount", false),
    kind: oneOf(body.kind ?? "in", ["in", "out"] as const, "Kind"),
    entryOn: parseDate(body.entryOn, "Date"),
    notes: optionalMessage(body.notes, "Notes", 2000),
  };
}

function optionalBirthDate(value: unknown, field: string): string | null {
  if (value == null || value === "") return null;
  return parseBirthDate(value, field);
}

function optionalDate(value: unknown, field: string): string | null {
  if (value == null || value === "") return null;
  return parseDate(value, field);
}

export function teacherFields(body: Record<string, unknown>) {
  return {
    name: requiredText(body.name, "Name", 255),
    dateOfBirth: optionalBirthDate(body.dateOfBirth, "Date of birth"),
    gender: oneOf(body.gender, ["male", "female"] as const, "Gender"),
    phone: optionalPhone(body.phone, "Phone"),
    nationalId: optionalText(body.nationalId, "ID number", 64),
    mpesaName: optionalText(body.mpesaName, "M-Pesa name", 255),
    mpesaNumber: optionalPhone(body.mpesaNumber, "M-Pesa number"),
    expectedSalary: parseMoney(body.expectedSalary, "Expected salary", true),
    expectedReleaseDate: optionalDate(body.expectedReleaseDate, "Expected release date"),
    paidInAdvance: parseBoolean(body.paidInAdvance, "Paid in advance"),
    section: oneOf(body.section, ["morning", "evening", "both"] as const, "Section"),
  };
}

export function optionalTeacherIds(value: unknown): number[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new ValidationError("Choose a valid list of teachers.");
  const ids = value.map((item) => {
    const id = typeof item === "number" ? item : Number(item);
    if (!Number.isSafeInteger(id) || id <= 0) throw new ValidationError("Choose a valid teacher.");
    return id;
  });
  return Array.from(new Set(ids));
}

export function classSectionField(body: Record<string, unknown>) {
  return oneOf(body.section ?? "morning", ["morning", "evening"] as const, "Section");
}
