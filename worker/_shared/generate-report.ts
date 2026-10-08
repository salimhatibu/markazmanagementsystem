import { getStore } from "./r2";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db/index";
import { expenses, notifications, reports, type ReportRow } from "../../db/schema";
import { isUniqueViolation } from "./http";
import { ageFromDob, asIso, CURRENCY, displayName, eatDate, monthName } from "../../shared/format";
import { presentLetterhead } from "../../shared/letterhead";
import { fromCents, operationsTotals, studentFigures, teacherFigures, toCents } from "../../shared/ledger";
import { buildOperationsPdf, type FeeReceiptLine, type OperationsReport, type SalaryLine } from "../../shared/pdf";
import { rangeFor, rangeForScope, type DateRange, type ReceiptScope } from "../../shared/periods";
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

type ReportSection = "all" | "morning" | "evening";

function reportTitle(period: "biweekly" | "monthly", start: string, end: string, section: ReportSection) {
  const sectionLabel = section === "morning" ? "Tahfeedh morning" : section === "evening" ? "Taaleem evening" : "";
  return `${period === "biweekly" ? "Biweekly" : "Monthly"}${sectionLabel ? ` ${sectionLabel}` : ""} report ${start} to ${end}`;
}

function presentReport(row: ReportRow, created: boolean) {
  return {
    id: row.id,
    period: row.period,
    section: row.section,
    rangeStart: row.rangeStart,
    rangeEnd: row.rangeEnd,
    createdAt: asIso(row.createdAt),
    title: reportTitle(row.period, row.rangeStart, row.rangeEnd, row.section),
    created,
  };
}

async function existingReport(period: "biweekly" | "monthly", range: DateRange, section: ReportSection) {
  const [row] = await db
    .select()
    .from(reports)
    .where(
      and(
        eq(reports.period, period),
        eq(reports.rangeStart, range.start),
        eq(reports.rangeEnd, range.end),
        eq(reports.section, section),
      ),
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
  salaryRows: { teacherId: number; amount: string; paidOn: string; note: string | null }[],
  range: DateRange,
): SalaryLine[] {
  const lines: SalaryLine[] = [];
  for (const teacher of teachers) {
    const paid = salaryRows
      .filter((row) => row.teacherId === teacher.id && row.paidOn >= range.start && row.paidOn <= range.end)
      .sort((a, b) => a.paidOn.localeCompare(b.paidOn));
    const base = {
      name: teacher.name,
      phone: teacher.phone?.trim() || "",
      nationalId: teacher.nationalId?.trim() || "",
      mpesaName: teacher.mpesaName?.trim() || "",
      mpesaNumber: teacher.mpesaNumber?.trim() || "",
      section: teacher.section,
    };
    if (paid.length === 0) {
      lines.push({
        ...base,
        salaryCents: toCents(teacher.expectedSalary),
        mpesaRef: "",
        paidOn: "",
      });
      continue;
    }
    for (const row of paid) {
      lines.push({
        ...base,
        salaryCents: toCents(row.amount),
        mpesaRef: row.note?.trim() || "",
        paidOn: row.paidOn,
      });
    }
  }
  return lines;
}

export async function feeReceiptPreview(scope: ReceiptScope, now = new Date(), section: ReportSection = "all") {
  const range = rangeForScope(scope, now);
  const [feeRows, studentRows, teacherRows, salaryRows, settingsRow] = await Promise.all([
    listFeePayments(),
    listStudents(),
    listTeachers(),
    listSalaryPayments(),
    loadSettings(),
  ]);
  const sectionStudents = section === "all"
    ? studentRows
    : studentRows.filter((student) => student.section === section);
  const sectionTeachers = section === "all"
    ? teacherRows
    : teacherRows.filter((teacher) => teacher.section === section);
  const studentIds = new Set(sectionStudents.map((student) => student.id));
  const teacherIds = new Set(sectionTeachers.map((teacher) => teacher.id));
  const lines = feeLinesInRange(feeRows.filter((row) => studentIds.has(row.studentId)), sectionStudents, range);
  const salaries = salaryLinesFor(sectionTeachers, salaryRows.filter((row) => teacherIds.has(row.teacherId)), range);
  const totalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  const salaryCents = salaries.reduce((sum, line) => sum + line.salaryCents, 0);
  const month = monthName(range.start);
  const complete = scope !== "current";
  const letterhead = presentLetterhead(settingsRow);
  return {
    scope,
    section,
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
      mpesaRef: line.mpesaRef || "",
      paidOn: line.paidOn || "",
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
  section: ReportSection = "all",
) {
  const range = scope ? rangeForScope(scope, now) : rangeFor(period, now);
  const already = await existingReport(period, range, section);
  if (already) return presentReport(already, false);
  const [studentRows, teacherRows, feeRows, salaryRows, expenseRows, settingsRow] = await Promise.all([
    listStudents(),
    listTeachers(),
    listFeePayments(),
    listSalaryPayments(),
    listExpenses(),
    loadSettings(),
  ]);

  const sectionStudents = section === "all"
    ? studentRows
    : studentRows.filter((student) => student.section === section);
  const sectionTeachers = section === "all"
    ? teacherRows
    : teacherRows.filter((teacher) => teacher.section === section);
  const sectionStudentIds = new Set(sectionStudents.map((student) => student.id));
  const sectionTeacherIds = new Set(sectionTeachers.map((teacher) => teacher.id));
  const sectionFeeRows = feeRows.filter((row) => sectionStudentIds.has(row.studentId));
  const sectionSalaryRows = salaryRows.filter((row) => sectionTeacherIds.has(row.teacherId));

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

  const studentMoney = sectionStudents.map((student) => ({
    expectedCents: toCents(student.expectedFees),
    paidCents: sumCents(feesByStudent.get(student.id) ?? []),
  }));
  const teacherMoney = sectionTeachers.map((teacher) => ({
    expectedCents: toCents(teacher.expectedSalary),
    paidCents: sumCents(salaryByTeacher.get(teacher.id) ?? []),
  }));
  const sectionExpenses = section === "all" ? sumCents(expenseRows) : 0;
  const totals = operationsTotals(studentMoney, teacherMoney, sectionExpenses);
  const feesInPeriod = sumCents(sectionFeeRows.filter((row) => row.paidOn >= range.start && row.paidOn <= range.end));
  const salariesInPeriod = sumCents(sectionSalaryRows.filter((row) => row.paidOn >= range.start && row.paidOn <= range.end));
  const expensesInPeriod = section === "all" ? await sumExpensesInRange(range) : 0;

  const symbol = settingsRow?.currencySymbol?.trim() || CURRENCY;
  const report: OperationsReport = {
    markazName: displayName(settingsRow?.markazName),
    currencySymbol: symbol,
    period,
    section,
    rangeStart: range.start,
    rangeEnd: range.end,
    generatedAt: now.toISOString(),
    feesCollectedCents: feesInPeriod,
    inHandCents: feesInPeriod - salariesInPeriod - expensesInPeriod,
    spentCents: salariesInPeriod + expensesInPeriod,
    outstandingCents: totals.outstandingCents,
    feesInPeriodCents: feesInPeriod,
    salariesInPeriodCents: salariesInPeriod,
    expensesInPeriodCents: expensesInPeriod,
    letterhead: presentLetterhead(settingsRow),
    feeLines: feeLinesInRange(sectionFeeRows, sectionStudents, range),
    salaryLines: salaryLinesFor(sectionTeachers, sectionSalaryRows, range),
    students: sectionStudents.map((student) => {
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
    teachers: sectionTeachers.map((teacher) => {
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
  const blobKey = `reports/${period}/${section}/${range.start}_${range.end}-${now.getTime()}.pdf`;
  await reportStore().set(blobKey, Uint8Array.from(pdfBytes).buffer);

  const title = reportTitle(period, range.start, range.end, section);
  try {
    // D1 does not support BEGIN/COMMIT via drizzle transactions.
    const [row] = await db
      .insert(reports)
      .values({
        period,
        section,
        rangeStart: range.start,
        rangeEnd: range.end,
        blobKey,
      })
      .returning();
    await db.insert(notifications).values({
      title,
      reportId: row.id,
    });
    return presentReport(row, true);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const again = await existingReport(period, range, section);
      if (again) return presentReport(again, false);
    }
    throw error;
  }
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
  return stored instanceof ArrayBuffer ? new Uint8Array(stored) : null;
}

export async function deleteReportPdf(blobKey: string): Promise<void> {
  if (!isReportBlobKey(blobKey)) return;
  try {
    await reportStore().delete(blobKey);
  } catch {
    /* already gone */
  }
}
