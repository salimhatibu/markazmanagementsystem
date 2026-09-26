import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { students } from "../../db/schema";
import { paymentsForStudent, studentOrNull, toStudent } from "./_shared/data";
import { fail, handleError, json, parseId, readBody, requireAdmin } from "./_shared/http";
import {
  oneOf,
  optionalEmail,
  optionalText,
  parseBirthDate,
  parseMoney,
  requiredEmail,
  requiredText,
} from "./_shared/validate";

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
          admissionNumber: requiredText(body.admissionNumber, "Admission number", 64),
          name: requiredText(body.name, "Name", 255),
          dateOfBirth: parseBirthDate(body.dateOfBirth, "Date of birth"),
          gender: oneOf(body.gender, ["male", "female"] as const, "Gender"),
          section: oneOf(body.section, ["morning", "evening"] as const, "Section"),
          expectedFees: parseMoney(body.expectedFees, "Expected fees", true),
          guardianName: requiredText(body.guardianName, "Guardian name", 255),
          guardianPhone: requiredText(body.guardianPhone, "Guardian phone", 64),
          guardianEmail: requiredEmail(body.guardianEmail, "Guardian email"),
          secondContactName: optionalText(body.secondContactName, "Second contact name", 255),
          secondContactPhone: optionalText(body.secondContactPhone, "Second contact phone", 64),
          secondContactEmail: optionalEmail(body.secondContactEmail, "Second contact email"),
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
