import { getStore } from "@netlify/blobs";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../../../db/index";
import { expenses, feePayments, notifications, reports, salaryPayments, type ReportRow } from "../../../db/schema";
import { isUniqueViolation } from "./http";
import { ageFromDob, asIso, CURRENCY, displayName, eatDate, monthName } from "../../../shared/format";
import { presentLetterhead } from "../../../shared/letterhead";
import { fromCents, operationsTotals, studentFigures, teacherFigures, toCents } from "../../../shared/ledger";
import { buildOperationsPdf, type FeeReceiptLine, type OperationsReport, type SalaryLine } from "../../../shared/pdf";
import { rangeFor, rangeForScope, type DateRange, type ReceiptScope } from "../../../shared/periods";
import {
  listExpenses,
  listFeePayments,
  listSalaryPayments,
  listStudents,
  listTeachers,
  loadSettings,
  sumCents,
} from "./data";
import { isReportBlobKey } from "./validate";

/** Report PDFs are files, so they live in Blobs and the row only keeps the key. */
const reportStore = () => getStore("markaz-reports");

function reportTitle(period: "biweekly" | "monthly", start: string, end: string) {
  return `${period === "biweekly" ? "Biweekly" : "Monthly"} report ${start} to ${end}`;
}

function presentReport(row: ReportRow, created: boolean) {
  return {
    id: row.id,
    period: row.period,
    rangeStart: row.rangeStart,
    rangeEnd: row.rangeEnd,
    createdAt: asIso(row.createdAt),
    title: reportTitle(row.period, row.rangeStart, row.rangeEnd),
    created,
  };
}

async function existingReport(period: "biweekly" | "monthly", range: DateRange) {
  const [row] = await db
    .select()
    .from(reports)
    .where(
      and(eq(reports.period, period), eq(reports.rangeStart, range.start), eq(reports.rangeEnd, range.end)),
    )
    .limit(1);
  return row ?? null;
}

function feeLinesInRange(
  feeRows: { id: number; studentId: number; amount: string; paidOn: string; note: string | null }[],
  students: { id: number; name: string; admissionNumber: string; section: "morning" | "evening" }[],
  range: DateRange,
): FeeReceiptLine[] {
  const byId = new Map(students.map((student) => [student.id, student]));
  return feeRows
    .filter((row) => row.paidOn >= range.start && row.paidOn <= range.end)
    .sort((a, b) => a.paidOn.localeCompare(b.paidOn) || a.id - b.id)
    .map((row) => {
      const student = byId.get(row.studentId);
      return {
        studentName: student?.name ?? "",
        admissionNumber: student?.admissionNumber ?? "",
        section: student?.section ?? "morning",
        mpesaRef: row.note?.trim() || "",
        amountCents: toCents(row.amount),
        paidOn: row.paidOn,
      };
    });
}

function salaryLinesFor(
  teachers: {
    id: number;
    name: string;
    phone: string | null;
    nationalId: string | null;
    mpesaName: string | null;
    mpesaNumber: string | null;
    section: "morning" | "evening" | "both";
    expectedSalary: string;
  }[],
  salaryRows: { teacherId: number; amount: string; paidOn: string }[],
  range: DateRange,
): SalaryLine[] {
  return teachers.map((teacher) => {
    const paid = salaryRows.filter(
      (row) => row.teacherId === teacher.id && row.paidOn >= range.start && row.paidOn <= range.end,
    );
    const paidCents = sumCents(paid);
    return {
      name: teacher.name,
      phone: teacher.phone?.trim() || "",
      nationalId: teacher.nationalId?.trim() || "",
      mpesaName: teacher.mpesaName?.trim() || "",
      mpesaNumber: teacher.mpesaNumber?.trim() || "",
      section: teacher.section,
      salaryCents: paidCents > 0 ? paidCents : toCents(teacher.expectedSalary),
    };
  });
}

export async function feeReceiptPreview(scope: ReceiptScope, now = new Date()) {
  const range = rangeForScope(scope, now);
  const [feeRows, studentRows, teacherRows, salaryRows, settingsRow] = await Promise.all([
    listFeePayments(),
    listStudents(),
    listTeachers(),
    listSalaryPayments(),
    loadSettings(),
  ]);
  const lines = feeLinesInRange(feeRows, studentRows, range);
  const salaries = salaryLinesFor(teacherRows, salaryRows, range);
  const totalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  const salaryCents = salaries.reduce((sum, line) => sum + line.salaryCents, 0);
  const month = monthName(range.start);
  const complete = scope !== "current";
  const letterhead = presentLetterhead(settingsRow);
  return {
    scope,
    rangeStart: range.start,
    rangeEnd: range.end,
    title: `${month} report`,
    preparedOn: eatDate(now),
    monthName: month,
    currencySymbol: settingsRow?.currencySymbol?.trim() || CURRENCY,
    letterhead,
    lines: lines.map((line) => ({
      studentName: line.studentName,
      admissionNumber: line.admissionNumber,
      section: line.section,
      mpesaRef: line.mpesaRef,
      amount: fromCents(line.amountCents),
      paidOn: line.paidOn,
    })),
    salaries: salaries.map((line) => ({
      name: line.name,
      phone: line.phone,
      nationalId: line.nationalId,
      mpesaName: line.mpesaName,
      mpesaNumber: line.mpesaNumber,
      section: line.section,
      salary: fromCents(line.salaryCents),
    })),
    totalReceived: fromCents(totalCents),
    totalSalaries: fromCents(salaryCents),
    summary: complete
      ? `By the end of ${month} this amount of money has entered the account.`
      : `This amount of money has entered the account so far in ${month}.`,
  };
}

export async function generateOperationsReport(
  period: "biweekly" | "monthly",
  now = new Date(),
  scope?: ReceiptScope,
) {
  const range = scope ? rangeForScope(scope, now) : rangeFor(period, now);
  const already = await existingReport(period, range);
  if (already) return presentReport(already, false);
  const [studentRows, teacherRows, feeRows, salaryRows, expenseRows, settingsRow] = await Promise.all([
    listStudents(),
    listTeachers(),
    listFeePayments(),
    listSalaryPayments(),
    listExpenses(),
    loadSettings(),
  ]);

  const feesByStudent = new Map<number, typeof feeRows>();
  for (const payment of feeRows) {
    const list = feesByStudent.get(payment.studentId) ?? [];
    list.push(payment);
    feesByStudent.set(payment.studentId, list);
  }
  const salaryByTeacher = new Map<number, typeof salaryRows>();
  for (const payment of salaryRows) {
    const list = salaryByTeacher.get(payment.teacherId) ?? [];
    list.push(payment);
    salaryByTeacher.set(payment.teacherId, list);
  }

  const studentMoney = studentRows.map((student) => ({
    expectedCents: toCents(student.expectedFees),
    paidCents: sumCents(feesByStudent.get(student.id) ?? []),
  }));
  const teacherMoney = teacherRows.map((teacher) => ({
    expectedCents: toCents(teacher.expectedSalary),
    paidCents: sumCents(salaryByTeacher.get(teacher.id) ?? []),
  }));
  const totals = operationsTotals(studentMoney, teacherMoney, sumCents(expenseRows));
  const feesInPeriod = await sumInRange(feePayments, range);
  const salariesInPeriod = await sumInRange(salaryPayments, range);
  const expensesInPeriod = await sumExpensesInRange(range);

  const symbol = settingsRow?.currencySymbol?.trim() || CURRENCY;
  const report: OperationsReport = {
    markazName: displayName(settingsRow?.markazName),
    currencySymbol: symbol,
    period,
    rangeStart: range.start,
    rangeEnd: range.end,
    generatedAt: now.toISOString(),
    feesCollectedCents: totals.feesCollectedCents,
    inHandCents: totals.inHandCents,
    spentCents: totals.spentCents,
    outstandingCents: totals.outstandingCents,
    feesInPeriodCents: feesInPeriod,
    salariesInPeriodCents: salariesInPeriod,
    expensesInPeriodCents: expensesInPeriod,
    letterhead: presentLetterhead(settingsRow),
    feeLines: feeLinesInRange(feeRows, studentRows, range),
    salaryLines: salaryLinesFor(teacherRows, salaryRows, range),
    students: studentRows.map((student) => {
      const paidCents = sumCents(feesByStudent.get(student.id) ?? []);
      const expectedCents = toCents(student.expectedFees);
      const figures = studentFigures(expectedCents, paidCents);
      return {
        admissionNumber: student.admissionNumber,
        name: student.name,
        age: ageFromDob(student.dateOfBirth, now),
        gender: student.gender as "male" | "female",
        section: student.section as "morning" | "evening",
        expectedCents,
        paidCents,
        balanceCents: figures.balanceCents,
        outstandingCents: figures.outstandingCents,
        percentPaid: figures.percentPaid,
        guardianName: student.guardianName,
      };
    }),
    teachers: teacherRows.map((teacher) => {
      const paidCents = sumCents(salaryByTeacher.get(teacher.id) ?? []);
      const expectedCents = toCents(teacher.expectedSalary);
      const figures = teacherFigures(expectedCents, paidCents);
      return {
        name: teacher.name,
        section: teacher.section as "morning" | "evening" | "both",
        phone: teacher.phone ?? "",
        nationalId: teacher.nationalId ?? "",
        expectedCents,
        paidCents,
        balanceCents: figures.balanceCents,
        expectedReleaseDate: teacher.expectedReleaseDate,
        paidInAdvance: teacher.paidInAdvance,
      };
    }),
  };

  const pdfBytes = await buildOperationsPdf(report);
  const blobKey = `reports/${period}/${range.start}_${range.end}-${now.getTime()}.pdf`;
  await reportStore().set(blobKey, Uint8Array.from(pdfBytes).buffer);

  const title = reportTitle(period, range.start, range.end);
  try {
    const saved = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(reports)
        .values({
          period,
          rangeStart: range.start,
          rangeEnd: range.end,
          blobKey,
        })
        .returning();
      await tx.insert(notifications).values({
        title,
        reportId: row.id,
      });
      return row;
    });
    return presentReport(saved, true);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const again = await existingReport(period, range);
      if (again) return presentReport(again, false);
    }
    throw error;
  }
}

async function sumInRange(
  table: typeof feePayments | typeof salaryPayments,
  range: DateRange,
): Promise<number> {
  const rows = await db
    .select({ amount: table.amount })
    .from(table)
    .where(and(gte(table.paidOn, range.start), lte(table.paidOn, range.end)));
  return sumCents(rows);
}

async function sumExpensesInRange(range: DateRange): Promise<number> {
  const rows = await db
    .select({ amount: expenses.amount })
    .from(expenses)
    .where(and(gte(expenses.spentOn, range.start), lte(expenses.spentOn, range.end)));
  return sumCents(rows);
}

export async function readReportPdf(blobKey: string): Promise<Uint8Array | null> {
  if (!isReportBlobKey(blobKey)) return null;
  const stored = await reportStore().get(blobKey, { type: "arrayBuffer" });
  return stored ? new Uint8Array(stored) : null;
}
