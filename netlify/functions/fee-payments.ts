import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { feePayments } from "../../db/schema";
import { paymentsForStudent, studentOrNull, toPayment, toStudent } from "./_shared/data";
import { fail, handleError, json, parseId, readBody } from "./_shared/http";
import { optionalText, parseDate, parseMoney } from "./_shared/validate";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);

  try {
    if (url.pathname.startsWith("/api/fee-payments/")) {
      if (req.method !== "DELETE") return fail("Method not allowed.", 405);
      const paymentId = parseId(context.params.id);
      if (paymentId == null) return fail("Payment not found.", 404);
      const [removed] = await db
        .delete(feePayments)
        .where(eq(feePayments.id, paymentId))
        .returning();
      if (!removed) return fail("Payment not found.", 404);
      const student = await studentOrNull(removed.studentId);
      if (!student) return json({ ok: true });
      return json({ student: toStudent(student, await paymentsForStudent(student.id)) });
    }

    const studentId = parseId(context.params.id);
    if (studentId == null) return fail("Student not found.", 404);
    const student = await studentOrNull(studentId);
    if (!student) return fail("Student not found.", 404);

    if (req.method === "GET") {
      const payments = await paymentsForStudent(studentId);
      return json({ payments: payments.map(toPayment), student: toStudent(student, payments) });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      await db.insert(feePayments).values({
        studentId,
        amount: parseMoney(body.amount, "Amount", false),
        paidOn: parseDate(body.paidOn, "Date"),
        note: optionalText(body.note, "Note", 1000),
      });
      return json({ student: toStudent(student, await paymentsForStudent(studentId)) }, 201);
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: ["/api/students/:id/payments", "/api/fee-payments/:id"],
  method: ["GET", "POST", "DELETE"],
};
