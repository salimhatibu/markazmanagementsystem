import { and, gte, lte } from "drizzle-orm";
import { db } from "../../../db/index";
import { feePayments, notifications, reports, salaryPayments } from "../../../db/schema";
import { ageFromDob, asIso, displayName } from "../../../shared/format";
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

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

  const symbol = settingsRow?.currencySymbol?.trim() || null;
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
  const pdf = bytesToBase64(pdfBytes);

  const title = `${period === "biweekly" ? "Biweekly" : "Monthly"} report ${range.start} to ${range.end}`;
  const saved = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(reports)
      .values({
        period,
        rangeStart: range.start,
        rangeEnd: range.end,
        blobKey,
        pdf,
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

export async function readReportPdf(pdf: string): Promise<Uint8Array | null> {
  if (!pdf) return null;
  return base64ToBytes(pdf);
}
