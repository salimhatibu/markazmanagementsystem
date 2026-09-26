import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { salaryPayments } from "../../db/schema";
import { paymentsForTeacher, teacherOrNull, toPayment, toTeacher } from "./_shared/data";
import { fail, handleError, json, parseId, readBody, requireUser } from "./_shared/http";
import { optionalText, parseDate, parseMoney } from "./_shared/validate";

export default async (req: Request, context: Context) => {
  const denied = await requireUser();
  if (denied) return denied;

  const url = new URL(req.url);

  try {
    if (url.pathname.startsWith("/api/salary-payments/")) {
      if (req.method !== "DELETE") return fail("Method not allowed.", 405);
      const paymentId = parseId(context.params.id);
      if (paymentId == null) return fail("Payment not found.", 404);
      const [removed] = await db
        .delete(salaryPayments)
        .where(eq(salaryPayments.id, paymentId))
        .returning();
      if (!removed) return fail("Payment not found.", 404);
      const teacher = await teacherOrNull(removed.teacherId);
      if (!teacher) return json({ ok: true });
      return json({ teacher: toTeacher(teacher, await paymentsForTeacher(teacher.id)) });
    }

    const teacherId = parseId(context.params.id);
    if (teacherId == null) return fail("Teacher not found.", 404);
    const teacher = await teacherOrNull(teacherId);
    if (!teacher) return fail("Teacher not found.", 404);

    if (req.method === "GET") {
      const payments = await paymentsForTeacher(teacherId);
      return json({ payments: payments.map(toPayment), teacher: toTeacher(teacher, payments) });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      await db.insert(salaryPayments).values({
        teacherId,
        amount: parseMoney(body.amount, "Amount", false),
        paidOn: parseDate(body.paidOn, "Date"),
        note: optionalText(body.note, "Note", 1000),
      });
      return json({ teacher: toTeacher(teacher, await paymentsForTeacher(teacherId)) }, 201);
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: ["/api/teachers/:id/payments", "/api/salary-payments/:id"],
  method: ["GET", "POST", "DELETE"],
};
