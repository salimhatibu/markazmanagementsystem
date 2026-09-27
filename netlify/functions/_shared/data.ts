import { asc, desc, eq } from "drizzle-orm";
import { db } from "../../../db/index";
import {
  expenses,
  feePayments,
  salaryPayments,
  settings,
  students,
  teachers,
  type Expense,
  type FeePayment,
  type SalaryPayment,
  type SettingsRow,
  type Student,
  type Teacher,
} from "../../../db/schema";
import { ageFromDob } from "../../../shared/format";
import { fromCents, studentFigures, teacherFigures, toCents } from "../../../shared/ledger";

export async function loadSettings(): Promise<SettingsRow | null> {
  const rows = await db.select().from(settings).limit(1);
  return rows[0] ?? null;
}

export async function listStudents(): Promise<Student[]> {
  return db.select().from(students).orderBy(asc(students.admissionNumber));
}

export async function listTeachers(): Promise<Teacher[]> {
  return db.select().from(teachers).orderBy(asc(teachers.name), asc(teachers.id));
}

export async function listFeePayments(): Promise<FeePayment[]> {
  return db
    .select()
    .from(feePayments)
    .orderBy(desc(feePayments.paidOn), desc(feePayments.id));
}

export async function listExpenses(): Promise<Expense[]> {
  return db.select().from(expenses).orderBy(desc(expenses.spentOn), desc(expenses.id));
}

export function toExpense(row: Expense) {
  return {
    id: row.id,
    reason: row.reason,
    amount: fromCents(toCents(row.amount)),
    details: row.details,
    spentOn: row.spentOn,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

export async function listSalaryPayments(): Promise<SalaryPayment[]> {
  return db
    .select()
    .from(salaryPayments)
    .orderBy(desc(salaryPayments.paidOn), desc(salaryPayments.id));
}

export function sumCents(rows: { amount: string }[]): number {
  return rows.reduce((total, row) => total + toCents(row.amount), 0);
}

export function toPayment(row: FeePayment | SalaryPayment) {
  return {
    id: row.id,
    amount: fromCents(toCents(row.amount)),
    paidOn: row.paidOn,
    note: row.note,
  };
}

export function toStudent(row: Student, payments: FeePayment[]) {
  const expectedCents = toCents(row.expectedFees);
  const paidCents = sumCents(payments);
  const figures = studentFigures(expectedCents, paidCents);
  return {
    id: row.id,
    admissionNumber: row.admissionNumber,
    name: row.name,
    dateOfBirth: row.dateOfBirth,
    age: ageFromDob(row.dateOfBirth),
    gender: row.gender,
    section: row.section,
    expectedFees: fromCents(expectedCents),
    paid: fromCents(paidCents),
    balance: fromCents(figures.balanceCents),
    outstanding: fromCents(figures.outstandingCents),
    percentPaid: figures.percentPaid,
    guardianName: row.guardianName,
    guardianPhone: row.guardianPhone,
    guardianEmail: row.guardianEmail,
    secondContactName: row.secondContactName,
    secondContactPhone: row.secondContactPhone,
    secondContactEmail: row.secondContactEmail,
    payments: payments.map(toPayment),
  };
}

export function toTeacher(row: Teacher, payments: SalaryPayment[]) {
  const expectedCents = toCents(row.expectedSalary);
  const paidCents = sumCents(payments);
  const figures = teacherFigures(expectedCents, paidCents);
  return {
    id: row.id,
    name: row.name,
    dateOfBirth: row.dateOfBirth,
    age: ageFromDob(row.dateOfBirth),
    gender: row.gender,
    section: row.section,
    expectedSalary: fromCents(expectedCents),
    paid: fromCents(paidCents),
    balance: fromCents(figures.balanceCents),
    expectedReleaseDate: row.expectedReleaseDate,
    paidInAdvance: row.paidInAdvance,
    payments: payments.map(toPayment),
  };
}

export async function studentOrNull(id: number) {
  const [row] = await db.select().from(students).where(eq(students.id, id)).limit(1);
  return row ?? null;
}

export async function teacherOrNull(id: number) {
  const [row] = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1);
  return row ?? null;
}

export async function paymentsForStudent(id: number) {
  return db
    .select()
    .from(feePayments)
    .where(eq(feePayments.studentId, id))
    .orderBy(desc(feePayments.paidOn), desc(feePayments.id));
}

export async function paymentsForTeacher(id: number) {
  return db
    .select()
    .from(salaryPayments)
    .where(eq(salaryPayments.teacherId, id))
    .orderBy(desc(salaryPayments.paidOn), desc(salaryPayments.id));
}
