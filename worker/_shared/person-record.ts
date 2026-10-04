import { ageFromDob, CURRENCY, displayName, formatPercent, label } from "../../shared/format";
import { presentLetterhead } from "../../shared/letterhead";
import { fromCents, studentFigures, teacherFigures, toCents } from "../../shared/ledger";
import { buildPersonRecordPdf, buildRosterPdf } from "../../shared/pdf";
import {
  listFeePayments,
  listSalaryPayments,
  listStudents,
  listTeachers,
  loadSettings,
  paymentsForStudent,
  paymentsForTeacher,
  studentOrNull,
  sumCents,
  teacherOrNull,
} from "./data";

function moneyText(cents: number): string {
  return fromCents(cents).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function studentRecordPdf(id: number): Promise<{ bytes: Uint8Array; filename: string } | null> {
  const row = await studentOrNull(id);
  if (!row) return null;
  const payments = await paymentsForStudent(id);
  const settings = await loadSettings();
  const expectedCents = toCents(row.expectedFees);
  const paidCents = payments.reduce((sum, payment) => sum + toCents(payment.amount), 0);
  const figures = studentFigures(expectedCents, paidCents);
  const symbol = settings?.currencySymbol?.trim() || CURRENCY;
  const bytes = await buildPersonRecordPdf({
    kind: "student",
    markazName: displayName(settings?.markazName),
    letterhead: presentLetterhead(settings),
    currencySymbol: symbol,
    generatedAt: new Date().toISOString(),
    title: `${row.name} · student record`,
    fields: [
      { label: "Admission", value: row.admissionNumber },
      { label: "Name", value: row.name },
      { label: "Date of birth", value: row.dateOfBirth },
      { label: "Date of admission", value: row.admittedOn || "—" },
      { label: "Age", value: String(ageFromDob(row.dateOfBirth)) },
      { label: "Gender", value: label(row.gender) },
      { label: "Section", value: label(row.section) },
      {
        label: "Admission fee",
        value: row.admissionFeeCollected
          ? `Collected · ${fromCents(toCents(row.admissionFeeAmount ?? "0")).toFixed(2)}`
          : "Not collected",
      },
      { label: "Guardian", value: row.guardianName },
      { label: "Guardian phone", value: row.guardianPhone },
      { label: "Guardian email", value: row.guardianEmail },
      { label: "Second contact", value: row.secondContactName ?? "" },
      { label: "Second phone", value: row.secondContactPhone ?? "" },
      { label: "Second email", value: row.secondContactEmail ?? "" },
    ],
    expectedCents,
    paidCents,
    balanceCents: figures.balanceCents,
    payments: payments.map((payment) => ({
      paidOn: payment.paidOn,
      amountCents: toCents(payment.amount),
      note: payment.note,
    })),
  });
  const filename = `student-${row.admissionNumber}-${row.name}.pdf`.replace(/[^A-Za-z0-9._-]/g, "-");
  return { bytes, filename };
}

export async function teacherRecordPdf(id: number): Promise<{ bytes: Uint8Array; filename: string } | null> {
  const row = await teacherOrNull(id);
  if (!row) return null;
  const payments = await paymentsForTeacher(id);
  const settings = await loadSettings();
  const expectedCents = toCents(row.expectedSalary);
  const paidCents = payments.reduce((sum, payment) => sum + toCents(payment.amount), 0);
  const figures = teacherFigures(expectedCents, paidCents);
  const symbol = settings?.currencySymbol?.trim() || CURRENCY;
  const bytes = await buildPersonRecordPdf({
    kind: "teacher",
    markazName: displayName(settings?.markazName),
    letterhead: presentLetterhead(settings),
    currencySymbol: symbol,
    generatedAt: new Date().toISOString(),
    title: `${row.name} · teacher record`,
    fields: [
      { label: "Name", value: row.name },
      { label: "Date of birth", value: row.dateOfBirth },
      { label: "Age", value: String(ageFromDob(row.dateOfBirth)) },
      { label: "Gender", value: label(row.gender) },
      { label: "Section", value: label(row.section) },
      { label: "Phone", value: row.phone ?? "" },
      { label: "National ID", value: row.nationalId ?? "" },
      { label: "M-Pesa name", value: row.mpesaName ?? "" },
      { label: "M-Pesa number", value: row.mpesaNumber ?? "" },
      { label: "Release date", value: row.expectedReleaseDate },
      { label: "Paid in advance", value: row.paidInAdvance ? "Yes" : "No" },
      { label: "Expected salary", value: fromCents(expectedCents).toFixed(2) },
    ],
    expectedCents,
    paidCents,
    balanceCents: figures.balanceCents,
    payments: payments.map((payment) => ({
      paidOn: payment.paidOn,
      amountCents: toCents(payment.amount),
      note: payment.note,
    })),
  });
  const filename = `teacher-${row.name}.pdf`.replace(/[^A-Za-z0-9._-]/g, "-");
  return { bytes, filename };
}

export async function studentsRosterPdf(): Promise<{ bytes: Uint8Array; filename: string }> {
  const [settings, studentRows, feeRows] = await Promise.all([
    loadSettings(),
    listStudents(),
    listFeePayments(),
  ]);
  const feesByStudent = new Map<number, typeof feeRows>();
  for (const payment of feeRows) {
    const list = feesByStudent.get(payment.studentId) ?? [];
    list.push(payment);
    feesByStudent.set(payment.studentId, list);
  }
  const symbol = settings?.currencySymbol?.trim() || CURRENCY;
  const bytes = await buildRosterPdf({
    markazName: displayName(settings?.markazName),
    letterhead: presentLetterhead(settings),
    currencySymbol: symbol,
    generatedAt: new Date().toISOString(),
    title: "Student list",
    subtitle: `${studentRows.length} ${studentRows.length === 1 ? "student" : "students"} · amounts in ${symbol}`,
    columns: [
      { label: "Adm.", width: 48 },
      { label: "Name", width: 100 },
      { label: "Section", width: 52 },
      { label: "Age", width: 28, align: "right" },
      { label: "Admitted", width: 58 },
      { label: "Expected", width: 58, align: "right" },
      { label: "Paid", width: 52, align: "right" },
      { label: "Balance", width: 52, align: "right" },
      { label: "%", width: 36, align: "right" },
      { label: "Guardian", width: 70 },
    ],
    rows: studentRows.map((student) => {
      const paidCents = sumCents(feesByStudent.get(student.id) ?? []);
      const expectedCents = toCents(student.expectedFees);
      const figures = studentFigures(expectedCents, paidCents);
      return [
        student.admissionNumber,
        student.name,
        label(student.section),
        String(ageFromDob(student.dateOfBirth)),
        student.admittedOn || "—",
        moneyText(expectedCents),
        moneyText(paidCents),
        moneyText(figures.balanceCents),
        formatPercent(figures.percentPaid),
        student.guardianName,
      ];
    }),
    empty: "No students recorded.",
  });
  return { bytes, filename: "markaz-students.pdf" };
}

export async function teachersRosterPdf(): Promise<{ bytes: Uint8Array; filename: string }> {
  const [settings, teacherRows, salaryRows] = await Promise.all([
    loadSettings(),
    listTeachers(),
    listSalaryPayments(),
  ]);
  const payByTeacher = new Map<number, typeof salaryRows>();
  for (const payment of salaryRows) {
    const list = payByTeacher.get(payment.teacherId) ?? [];
    list.push(payment);
    payByTeacher.set(payment.teacherId, list);
  }
  const symbol = settings?.currencySymbol?.trim() || CURRENCY;
  const bytes = await buildRosterPdf({
    markazName: displayName(settings?.markazName),
    letterhead: presentLetterhead(settings),
    currencySymbol: symbol,
    generatedAt: new Date().toISOString(),
    title: "Teacher list",
    subtitle: `${teacherRows.length} ${teacherRows.length === 1 ? "teacher" : "teachers"} · amounts in ${symbol}`,
    columns: [
      { label: "#", width: 24, align: "right" },
      { label: "Name", width: 100 },
      { label: "Phone", width: 72 },
      { label: "ID number", width: 70 },
      { label: "Section", width: 48 },
      { label: "Salary", width: 58, align: "right" },
      { label: "Paid", width: 52, align: "right" },
      { label: "Balance", width: 52, align: "right" },
      { label: "Release", width: 58 },
    ],
    rows: teacherRows.map((teacher, index) => {
      const paidCents = sumCents(payByTeacher.get(teacher.id) ?? []);
      const expectedCents = toCents(teacher.expectedSalary);
      const figures = teacherFigures(expectedCents, paidCents);
      return [
        String(index + 1),
        teacher.mpesaName && teacher.mpesaName !== teacher.name
          ? `${teacher.name} (${teacher.mpesaName})`
          : teacher.name,
        teacher.mpesaNumber || teacher.phone || "—",
        teacher.nationalId || "—",
        label(teacher.section),
        moneyText(expectedCents),
        moneyText(paidCents),
        moneyText(figures.balanceCents),
        teacher.expectedReleaseDate,
      ];
    }),
    empty: "No teachers recorded.",
  });
  return { bytes, filename: "markaz-teachers.pdf" };
}
