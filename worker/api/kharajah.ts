import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { feePayments, kharajah, students } from "../../db/schema";
import { requireAdmin } from "../_shared/auth";
import { kharajahOrNull, listKharajah, paymentsForStudent, studentOrNull, toKharajah } from "../_shared/data";
import { fail, handleError, json, parseId, readBody } from "../_shared/http";
import { toCents } from "../../shared/ledger";
import { kharajahLeaveFields } from "../_shared/validate";

function paidTotal(payments: { amount: string }[]): string {
  const cents = payments.reduce((sum, row) => sum + toCents(row.amount), 0);
  return (cents / 100).toFixed(2);
}

export default async (req: Request, context: { params: Record<string, string> }) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    if (req.method === "GET" && !context.params.id) {
      const rows = await listKharajah();
      return json({ leavers: rows.map(toKharajah) });
    }

    if (req.method === "GET" && context.params.id) {
      const id = parseId(context.params.id);
      if (id == null) return fail("Kharajah record not found.", 404);
      const row = await kharajahOrNull(id);
      if (!row) return fail("Kharajah record not found.", 404);
      return json({ leaver: toKharajah(row) });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = kharajahLeaveFields(body);
      const student = await studentOrNull(input.studentId);
      if (!student) return fail("That student is not on the active list.", 404);
      const payments = await paymentsForStudent(student.id);
      // D1 does not support BEGIN/COMMIT via drizzle transactions — use batch instead.
      const [inserted] = await db.batch([
        db
          .insert(kharajah)
          .values({
            admissionNumber: student.admissionNumber,
            name: student.name,
            dateOfBirth: student.dateOfBirth,
            gender: student.gender,
            section: student.section,
            expectedFees: student.expectedFees,
            admittedOn: student.admittedOn || "",
            admissionFeeCollected: Boolean(student.admissionFeeCollected),
            admissionFeeAmount: student.admissionFeeAmount ?? "0.00",
            feesPaid: paidTotal(payments),
            guardianName: student.guardianName,
            guardianPhone: student.guardianPhone,
            guardianEmail: student.guardianEmail,
            secondContactName: student.secondContactName,
            secondContactPhone: student.secondContactPhone,
            secondContactEmail: student.secondContactEmail,
            leftOn: input.leftOn,
            leaveReason: input.leaveReason,
            notes: input.notes,
          })
          .returning(),
        db.delete(feePayments).where(eq(feePayments.studentId, student.id)),
        db.delete(students).where(eq(students.id, student.id)),
      ]);
      const created = inserted[0];
      if (!created) return fail("The leave could not be recorded.", 500);
      return json({ leaver: toKharajah(created) }, 201);
    }

    if (req.method === "DELETE" && context.params.id) {
      const id = parseId(context.params.id);
      if (id == null) return fail("Kharajah record not found.", 404);
      const existing = await kharajahOrNull(id);
      if (!existing) return fail("Kharajah record not found.", 404);
      await db.delete(kharajah).where(eq(kharajah.id, id));
      return json({ ok: true });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
