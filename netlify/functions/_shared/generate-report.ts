import { getStore } from "@netlify/blobs";
import { and, gte, lte } from "drizzle-orm";
import { db } from "../../../db/index";
import { feePayments, notifications, reports, salaryPayments } from "../../../db/schema";
import { ageFromDob, asIso, CURRENCY, displayName } from "../../../shared/format";
import { operationsTotals, studentFigures, teacherFigures, toCents } from "../../../shared/ledger";
import { buildOperationsPdf, type OperationsReport } from "../../../shared/pdf";
import { rangeFor, type DateRange } from "../../../shared/periods";
import {
  listFeePayments,
  listSalaryPayments,
  listStudents,
  listTeachers,
  loadSettings,
  sumCents,
} from "./data";

/** Report PDFs are files, so they live in Blobs and the row only keeps the key. */
const reportStore = () => getStore("markaz-reports");

export async function generateOperationsReport(period: "biweekly" | "monthly", now = new Date()) {
  const range = rangeFor(period, now);
  const [studentRows, teacherRows, feeRows, salaryRows, settingsRow] = await Promise.all([
    listStudents(),
    listTeachers(),
    listFeePayments(),
    listSalaryPayments(),
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
  const totals = operationsTotals(studentMoney, teacherMoney);
  const feesInPeriod = await sumInRange(feePayments, range);
  const salariesInPeriod = await sumInRange(salaryPayments, range);

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

  const title = `${period === "biweekly" ? "Biweekly" : "Monthly"} report ${range.start} to ${range.end}`;
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

  return {
    id: saved.id,
    period: saved.period,
    rangeStart: saved.rangeStart,
    rangeEnd: saved.rangeEnd,
    createdAt: asIso(saved.createdAt),
    title,
  };
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

export async function readReportPdf(blobKey: string): Promise<Uint8Array | null> {
  if (!blobKey) return null;
  const stored = await reportStore().get(blobKey, { type: "arrayBuffer" });
  return stored ? new Uint8Array(stored) : null;
}
