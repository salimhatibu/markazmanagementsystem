import type { Config } from "@netlify/functions";
import { handleError, json, requireUser } from "./_shared/http";
import {
  listFeePayments,
  listSalaryPayments,
  listStudents,
  listTeachers,
  sumCents,
} from "./_shared/data";
import { operationsTotals, toCents } from "../../shared/ledger";

export default async (req: Request) => {
  if (req.method !== "GET") {
    return json({ error: "Method not allowed." }, 405);
  }
  const denied = await requireUser();
  if (denied) return denied;

  try {
    const [studentRows, teacherRows, feeRows, salaryRows] = await Promise.all([
      listStudents(),
      listTeachers(),
      listFeePayments(),
      listSalaryPayments(),
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
    const totals = operationsTotals(
      studentRows.map((student) => ({
        expectedCents: toCents(student.expectedFees),
        paidCents: sumCents(feesByStudent.get(student.id) ?? []),
      })),
      teacherRows.map((teacher) => ({
        expectedCents: toCents(teacher.expectedSalary),
        paidCents: sumCents(salaryByTeacher.get(teacher.id) ?? []),
      })),
    );
    return json({
      morningStudents: studentRows.filter((student) => student.section === "morning").length,
      eveningStudents: studentRows.filter((student) => student.section === "evening").length,
      teachers: teacherRows.length,
      feesCollected: totals.feesCollectedCents / 100,
      inHand: totals.inHandCents / 100,
      spent: totals.spentCents / 100,
      outstanding: totals.outstandingCents / 100,
    });
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/dashboard",
  method: "GET",
};
