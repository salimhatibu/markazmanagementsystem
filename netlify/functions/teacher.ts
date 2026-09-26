import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { teachers } from "../../db/schema";
import { paymentsForTeacher, teacherOrNull, toTeacher } from "./_shared/data";
import { fail, handleError, json, parseId, readBody, requireUser } from "./_shared/http";
import {
  oneOf,
  parseBirthDate,
  parseBoolean,
  parseDate,
  parseMoney,
  requiredText,
} from "./_shared/validate";

export default async (req: Request, context: Context) => {
  const denied = await requireUser();
  if (denied) return denied;

  const id = parseId(context.params.id);
  if (id == null) return fail("Teacher not found.", 404);

  try {
    const existing = await teacherOrNull(id);
    if (!existing) return fail("Teacher not found.", 404);

    if (req.method === "GET") {
      return json({ teacher: toTeacher(existing, await paymentsForTeacher(id)) });
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const [updated] = await db
        .update(teachers)
        .set({
          name: requiredText(body.name, "Name", 255),
          dateOfBirth: parseBirthDate(body.dateOfBirth, "Date of birth"),
          gender: oneOf(body.gender, ["male", "female"] as const, "Gender"),
          expectedSalary: parseMoney(body.expectedSalary, "Expected salary", true),
          expectedReleaseDate: parseDate(body.expectedReleaseDate, "Expected release date"),
          paidInAdvance: parseBoolean(body.paidInAdvance, "Paid in advance"),
          section: oneOf(body.section, ["morning", "evening", "both"] as const, "Section"),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(teachers.id, id))
        .returning();
      return json({ teacher: toTeacher(updated, await paymentsForTeacher(id)) });
    }

    if (req.method === "DELETE") {
      await db.delete(teachers).where(eq(teachers.id, id));
      return json({ ok: true });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/teachers/:id",
  method: ["GET", "PUT", "DELETE"],
};
