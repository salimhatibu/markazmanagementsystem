import { eq } from "drizzle-orm";
import { schoolClasses, students, type Student } from "../../db/schema";
import { db } from "../../db/index";
import { requireAdmin } from "../_shared/auth";
import { syncAdmissionFeePayment } from "../_shared/admission-fee";
import { fail, handleError, json, readBody } from "../_shared/http";
import { listFeePayments, paymentsForStudent, toStudent } from "../_shared/data";
import { studentFields } from "../_shared/validate";

async function classNameFor(classId: number | null) {
  if (classId == null) return null;
  const [row] = await db.select().from(schoolClasses).where(eq(schoolClasses.id, classId)).limit(1);
  return row?.name ?? null;
}

async function withPayments(row: Student) {
  const payments = await paymentsForStudent(row.id);
  return toStudent(row, payments, await classNameFor(row.classId));
}

export default async (req: Request) => {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    if (req.method === "GET") {
      const [rows, payments, classes] = await Promise.all([
        db.select().from(students).orderBy(students.admissionNumber),
        listFeePayments(),
        db.select().from(schoolClasses),
      ]);
      const grouped = new Map<number, typeof payments>();
      for (const payment of payments) {
        const list = grouped.get(payment.studentId) ?? [];
        list.push(payment);
        grouped.set(payment.studentId, list);
      }
      const names = new Map(classes.map((row) => [row.id, row.name]));
      return json({
        students: rows.map((row) => toStudent(row, grouped.get(row.id) ?? [], row.classId ? names.get(row.classId) ?? null : null)),
      });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = studentFields(body);
      if (input.classId != null && !(await classNameFor(input.classId))) return fail("That class was not found.", 400);
      const [created] = await db.insert(students).values(input).returning();
      await syncAdmissionFeePayment(created.id, input.admissionFeeCollected, input.admissionFeeAmount);
      return json({ student: await withPayments(created) }, 201);
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
