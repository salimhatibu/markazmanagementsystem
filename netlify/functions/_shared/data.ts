import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
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
import { monthToDateRange } from "../../../shared/periods";

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

function firstRow(result: unknown): Record<string, unknown> {
  if (Array.isArray(result)) return (result[0] ?? {}) as Record<string, unknown>;
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown[] }).rows;
    if (Array.isArray(rows)) return (rows[0] ?? {}) as Record<string, unknown>;
  }
  return {};
}

function moneyFrom(value: unknown): number {
  if (value == null || value === "") return 0;
  return fromCents(toCents(typeof value === "number" ? value : String(value)));
}

function intFrom(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * Cash cards follow the current books — the first of this month through today,
 * the same window as the "This month" report. Still owed is the balance left
 * after every payment, not only this month's.
 */
export async function loadDashboardTotals(now = new Date()) {
  const range = monthToDateRange(now);
  const [feeRows, salaryRows, expenseRows, result] = await Promise.all([
    db
      .select({ amount: feePayments.amount })
      .from(feePayments)
      .where(and(gte(feePayments.paidOn, range.start), lte(feePayments.paidOn, range.end))),
    db
      .select({ amount: salaryPayments.amount })
      .from(salaryPayments)
      .where(and(gte(salaryPayments.paidOn, range.start), lte(salaryPayments.paidOn, range.end))),
    db
      .select({ amount: expenses.amount })
      .from(expenses)
      .where(and(gte(expenses.spentOn, range.start), lte(expenses.spentOn, range.end))),
    db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM students WHERE section = 'morning')::int AS morning_students,
        (SELECT COUNT(*) FROM students WHERE section = 'evening')::int AS evening_students,
        (SELECT COUNT(*) FROM teachers)::int AS teachers,
        COALESCE((
          SELECT SUM(GREATEST(0::numeric, s.expected_fees - COALESCE(p.paid, 0)))
          FROM students s
          LEFT JOIN (
            SELECT student_id, SUM(amount) AS paid
            FROM fee_payments
            GROUP BY student_id
          ) p ON p.student_id = s.id
        ), 0) AS outstanding
    `),
  ]);
  const row = firstRow(result);
  const feesCollected = fromCents(sumCents(feeRows));
  const salariesPaid = fromCents(sumCents(salaryRows));
  const expensesTotal = fromCents(sumCents(expenseRows));
  const outstanding = moneyFrom(row.outstanding);
  return {
    morningStudents: intFrom(row.morning_students ?? row.morningStudents),
    eveningStudents: intFrom(row.evening_students ?? row.eveningStudents),
    teachers: intFrom(row.teachers),
    feesCollected,
    salariesPaid,
    expenses: expensesTotal,
    outstanding,
    inHand: fromCents(toCents(feesCollected) - toCents(salariesPaid) - toCents(expensesTotal)),
    spent: fromCents(toCents(salariesPaid) + toCents(expensesTotal)),
    booksStart: range.start,
    booksEnd: range.end,
  };
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
    phone: row.phone,
    nationalId: row.nationalId,
    mpesaName: row.mpesaName,
    mpesaNumber: row.mpesaNumber,
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
