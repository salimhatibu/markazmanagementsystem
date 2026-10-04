import { emptyStudent, emptyTeacher, type StudentInput, type TeacherInput } from "../types";

function text(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function money(value: unknown): string {
  const raw = text(value).replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (!raw) return "";
  const amount = Number(raw);
  return Number.isFinite(amount) ? String(amount) : "";
}

function bool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const raw = text(value).toLowerCase();
  return raw === "true" || raw === "yes" || raw === "1";
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const raw = text(value).toLowerCase();
  return (allowed.find((item) => item === raw) ?? fallback) as T;
}

export function studentFromOcr(fields: Record<string, unknown>): StudentInput {
  const base = emptyStudent();
  return {
    ...base,
    admissionNumber: text(fields.admissionNumber) || base.admissionNumber,
    name: text(fields.name) || base.name,
    dateOfBirth: text(fields.dateOfBirth) || base.dateOfBirth,
    admittedOn: text(fields.admittedOn) || base.admittedOn,
    gender: oneOf(fields.gender, ["male", "female"] as const, base.gender),
    section: oneOf(fields.section, ["morning", "evening"] as const, base.section),
    expectedFees: money(fields.expectedFees) || base.expectedFees,
    admissionFeeCollected: bool(fields.admissionFeeCollected),
    admissionFeeAmount: money(fields.admissionFeeAmount) || base.admissionFeeAmount,
    guardianName: text(fields.guardianName) || base.guardianName,
    guardianPhone: text(fields.guardianPhone) || base.guardianPhone,
    guardianEmail: text(fields.guardianEmail) || base.guardianEmail,
    secondContactName: text(fields.secondContactName),
    secondContactPhone: text(fields.secondContactPhone),
    secondContactEmail: text(fields.secondContactEmail),
  };
}

export function teacherFromOcr(fields: Record<string, unknown>): TeacherInput {
  const base = emptyTeacher();
  return {
    ...base,
    name: text(fields.name) || base.name,
    dateOfBirth: text(fields.dateOfBirth) || base.dateOfBirth,
    gender: oneOf(fields.gender, ["male", "female"] as const, base.gender),
    section: oneOf(fields.section, ["morning", "evening", "both"] as const, base.section),
    phone: text(fields.phone),
    nationalId: text(fields.nationalId),
    mpesaName: text(fields.mpesaName),
    mpesaNumber: text(fields.mpesaNumber),
    expectedSalary: money(fields.expectedSalary) || base.expectedSalary,
    expectedReleaseDate: text(fields.expectedReleaseDate) || base.expectedReleaseDate,
    paidInAdvance: bool(fields.paidInAdvance),
  };
}

export function expenseFromOcr(fields: Record<string, unknown>): {
  reason: string;
  customReason: string;
  amount: string;
  details: string;
  spentOn: string;
} {
  const reasons = ["Maintenance", "Books", "Food", "Transport", "Utilities", "Other"];
  const rawReason = text(fields.reason);
  const match = reasons.find((item) => item.toLowerCase() === rawReason.toLowerCase());
  return {
    reason: match ?? (rawReason ? "Other" : "Maintenance"),
    customReason: match || !rawReason ? "" : rawReason,
    amount: money(fields.amount),
    details: text(fields.details),
    spentOn: text(fields.spentOn),
  };
}

export function bookFromOcr(fields: Record<string, unknown>): {
  title: string;
  purchasedOn: string;
  items: { name: string; price: string }[];
  stationeriesNote: string;
  stationeriesCost: string;
} {
  const rawItems = Array.isArray(fields.items) ? fields.items : [];
  const items = rawItems
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const name = text(row.name);
      const price = money(row.price);
      if (!name && !price) return null;
      return { name, price };
    })
    .filter((item): item is { name: string; price: string } => item != null);

  return {
    title: text(fields.title),
    purchasedOn: text(fields.purchasedOn),
    items: items.length > 0 ? items : [{ name: "", price: "" }],
    stationeriesNote: text(fields.stationeriesNote),
    stationeriesCost: money(fields.stationeriesCost),
  };
}
