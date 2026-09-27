import { getStore } from "@netlify/blobs";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../../../db/index";
import { expenses, feePayments, notifications, reports, salaryPayments, type ReportRow } from "../../../db/schema";
import { isUniqueViolation } from "./http";
import { ageFromDob, asIso, CURRENCY, displayName } from "../../../shared/format";
import { operationsTotals, studentFigures, teacherFigures, toCents } from "../../../shared/ledger";
import { buildOperationsPdf, type OperationsReport } from "../../../shared/pdf";
import { rangeFor, type DateRange } from "../../../shared/periods";
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

export async function generateOperationsReport(period: "biweekly" | "monthly", now = new Date()) {
  const range = rangeFor(period, now);
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
