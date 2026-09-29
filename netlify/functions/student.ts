import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { students } from "../../db/schema";
import { paymentsForStudent, studentOrNull, toStudent } from "./_shared/data";
import { requireAdmin } from "./_shared/auth";
import { fail, handleError, json, parseId, readBody } from "./_shared/http";
import { studentFields } from "./_shared/validate";

export default async (req: Request, context: Context) => {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = parseId(context.params.id);
  if (id == null) return fail("Student not found.", 404);

  try {
    const existing = await studentOrNull(id);
    if (!existing) return fail("Student not found.", 404);

    if (req.method === "GET") {
      return json({ student: toStudent(existing, await paymentsForStudent(id)) });
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const [updated] = await db
        .update(students)
        .set({
          ...studentFields(body),
          updatedAt: new Date(),
        })
        .where(eq(students.id, id))
        .returning();
      return json({ student: toStudent(updated, await paymentsForStudent(id)) });
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

export const config: Config = {
  path: "/api/students/:id",
  method: ["GET", "PUT", "DELETE"],
};
