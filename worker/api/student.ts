import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { schoolClasses, students } from "../../db/schema";
import { syncAdmissionFeePayment } from "../_shared/admission-fee";
import { paymentsForStudent, studentOrNull, toStudent } from "../_shared/data";
import { requireAdmin } from "../_shared/auth";
import { fail, handleError, json, parseId, readBody } from "../_shared/http";
import { studentFields } from "../_shared/validate";

async function classNameFor(classId: number | null) {
  if (classId == null) return null;
  const [row] = await db.select().from(schoolClasses).where(eq(schoolClasses.id, classId)).limit(1);
  if (!row) return null;
  return row.name;
}

export default async (req: Request, context: Context) => {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = parseId(context.params.id);
  if (id == null) return fail("Student not found.", 404);

  try {
    const existing = await studentOrNull(id);
    if (!existing) return fail("Student not found.", 404);

    if (req.method === "GET") {
      return json({ student: toStudent(existing, await paymentsForStudent(id), await classNameFor(existing.classId)) });
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = studentFields(body);
      if (input.classId != null && !(await classNameFor(input.classId))) return fail("That class was not found.", 400);
      const [updated] = await db
        .update(students)
        .set({
          ...input,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(students.id, id))
        .returning();
      await syncAdmissionFeePayment(id, input.admissionFeeCollected, input.admissionFeeAmount);
      return json({ student: toStudent(updated, await paymentsForStudent(id), await classNameFor(updated.classId)) });
    }

    if (req.method === "DELETE") {
      await db.delete(students).where(eq(students.id, id));
      return json({ ok: true });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
