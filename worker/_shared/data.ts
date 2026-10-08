import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../../db/index";
import {
  bookInventories,
  bookInventoryItems,
  bookPurchases,
  expenses,
  feePayments,
  kharajah,
  salaryPayments,
  settings,
  students,
  teachers,
  tripEntries,
  trips,
  type BookInventory,
  type BookInventoryItem,
  type BookPurchase,
  type Expense,
  type FeePayment,
  type KharajahRow,
  type SalaryPayment,
  type SettingsRow,
  type Student,
  type Teacher,
  type Trip,
  type TripEntry,
} from "../../db/schema";
import { ageFromDob } from "../../shared/format";
import { fromCents, studentFigures, teacherFigures, toCents } from "../../shared/ledger";
import { monthToDateRange } from "../../shared/periods";

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
    createdAt: typeof row.createdAt === "string" ? row.createdAt : String(row.createdAt),
  };
}

export function toTripEntry(row: TripEntry) {
  return {
    id: row.id,
    tripId: row.tripId,
    description: row.description,
    quantity: row.quantity,
    amount: fromCents(toCents(row.amount)),
    kind: row.kind,
    entryOn: row.entryOn,
    notes: row.notes,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : String(row.createdAt),
  };
}

export function tripTotals(entries: { amount: string | number; kind: string }[]) {
  let receivedCents = 0;
  let spentCents = 0;
  for (const entry of entries) {
    const cents = toCents(entry.amount);
    if (entry.kind === "out") spentCents += cents;
    else receivedCents += cents;
  }
  return {
    received: fromCents(receivedCents),
    spent: fromCents(spentCents),
    balance: fromCents(receivedCents - spentCents),
    entryCount: entries.length,
  };
}

export function toTripSummary(row: Trip, entries: TripEntry[]) {
  const totals = tripTotals(entries);
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : String(row.createdAt),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : String(row.updatedAt),
    ...totals,
  };
}

export function toTripDetail(row: Trip, entries: TripEntry[]) {
  return {
    ...toTripSummary(row, entries),
    entries: entries.map(toTripEntry),
  };
}

export async function listTrips() {
  const rows = await db.select().from(trips).orderBy(desc(trips.updatedAt), desc(trips.id));
  if (rows.length === 0) return [];
  const allEntries = await db
    .select()
    .from(tripEntries)
    .where(
      inArray(
        tripEntries.tripId,
        rows.map((row) => row.id),
      ),
    );
  return rows.map((row) =>
    toTripSummary(
      row,
      allEntries.filter((entry) => entry.tripId === row.id),
    ),
  );
}

export async function tripOrNull(id: number) {
  const [row] = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
  return row ?? null;
}

export async function entriesForTrip(tripId: number) {
  return db
    .select()
    .from(tripEntries)
    .where(eq(tripEntries.tripId, tripId))
    .orderBy(desc(tripEntries.entryOn), desc(tripEntries.id));
}

export function toBookPurchase(row: BookPurchase) {
  const unitCents = toCents(row.unitCost);
  const totalCents = unitCents * row.quantity;
  return {
    id: row.id,
    name: row.name,
    unitCost: fromCents(unitCents),
    quantity: row.quantity,
    totalCost: fromCents(totalCents),
    purchasedOn: row.purchasedOn,
    expenseId: row.expenseId,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : String(row.createdAt),
  };
}

export function toBookInventory(row: BookInventory, items: BookInventoryItem[]) {
  const itemRows = items
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((item) => ({
      id: item.id,
      name: item.name,
      price: fromCents(toCents(item.price)),
      sortOrder: item.sortOrder,
    }));
  const booksCents = itemRows.reduce((sum, item) => sum + toCents(item.price), 0);
  const stationeriesCents = row.stationeriesCost ? toCents(row.stationeriesCost) : 0;
  return {
    id: row.id,
    title: row.title,
    purchasedOn: row.purchasedOn,
    stationeriesNote: row.stationeriesNote,
    stationeriesCost: row.stationeriesCost ? fromCents(toCents(row.stationeriesCost)) : null,
    items: itemRows,
    booksTotal: fromCents(booksCents),
    totalCost: fromCents(booksCents + stationeriesCents),
    expenseId: row.expenseId,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : String(row.createdAt),
  };
}

export async function listBookInventories() {
  const inventories = await db
    .select()
    .from(bookInventories)
    .orderBy(desc(bookInventories.purchasedOn), desc(bookInventories.id));
  if (inventories.length === 0) return [];
  const ids = inventories.map((row) => row.id);
  const allItems = await db
    .select()
    .from(bookInventoryItems)
    .where(inArray(bookInventoryItems.inventoryId, ids))
    .orderBy(asc(bookInventoryItems.sortOrder), asc(bookInventoryItems.id));
  const byInventory = new Map<number, BookInventoryItem[]>();
  for (const item of allItems) {
    const list = byInventory.get(item.inventoryId) ?? [];
    list.push(item);
    byInventory.set(item.inventoryId, list);
  }
  return inventories.map((row) => toBookInventory(row, byInventory.get(row.id) ?? []));
}

export async function listBookPurchases(): Promise<BookPurchase[]> {
  return db
    .select()
    .from(bookPurchases)
    .orderBy(desc(bookPurchases.purchasedOn), desc(bookPurchases.id));
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
    db.all(sql`
      SELECT
        (SELECT COUNT(*) FROM students WHERE section = 'morning') AS morning_students,
        (SELECT COUNT(*) FROM students WHERE section = 'evening') AS evening_students,
        (SELECT COUNT(*) FROM teachers) AS teachers,
        COALESCE((
          SELECT SUM(
            CASE
              WHEN CAST(s.expected_fees AS REAL) - COALESCE(p.paid, 0) > 0
              THEN CAST(s.expected_fees AS REAL) - COALESCE(p.paid, 0)
              ELSE 0
            END
          )
          FROM students s
          LEFT JOIN (
            SELECT student_id, SUM(CAST(amount AS REAL)) AS paid
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

export function toStudent(row: Student, payments: FeePayment[], className: string | null = null) {
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
    classId: row.classId,
    className,
    expectedFees: fromCents(expectedCents),
    admittedOn: row.admittedOn || (typeof row.createdAt === "string" ? row.createdAt.slice(0, 10) : ""),
    admissionFeeCollected: Boolean(row.admissionFeeCollected),
    admissionFeeAmount: fromCents(toCents(row.admissionFeeAmount ?? "0")),
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

export async function listKharajah(): Promise<KharajahRow[]> {
  return db.select().from(kharajah).orderBy(desc(kharajah.leftOn), desc(kharajah.id));
}

export function toKharajah(row: KharajahRow) {
  return {
    id: row.id,
    admissionNumber: row.admissionNumber,
    name: row.name,
    dateOfBirth: row.dateOfBirth,
    age: ageFromDob(row.dateOfBirth),
    gender: row.gender,
    section: row.section,
    expectedFees: fromCents(toCents(row.expectedFees)),
    admittedOn: row.admittedOn || "",
    admissionFeeCollected: Boolean(row.admissionFeeCollected),
    admissionFeeAmount: fromCents(toCents(row.admissionFeeAmount ?? "0")),
    feesPaid: fromCents(toCents(row.feesPaid ?? "0")),
    guardianName: row.guardianName,
    guardianPhone: row.guardianPhone,
    guardianEmail: row.guardianEmail,
    secondContactName: row.secondContactName,
    secondContactPhone: row.secondContactPhone,
    secondContactEmail: row.secondContactEmail,
    leftOn: row.leftOn,
    leaveReason: row.leaveReason,
    notes: row.notes,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : String(row.createdAt),
  };
}

export async function kharajahOrNull(id: number) {
  const [row] = await db.select().from(kharajah).where(eq(kharajah.id, id)).limit(1);
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
