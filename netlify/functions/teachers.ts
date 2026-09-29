import type { Config } from "@netlify/functions";
import { teachers, type Teacher } from "../../db/schema";
import { db } from "../../db/index";
import { requireAdmin } from "./_shared/auth";
import { fail, handleError, json, readBody } from "./_shared/http";
import { listSalaryPayments, paymentsForTeacher, toTeacher } from "./_shared/data";
import { teacherFields } from "./_shared/validate";

async function withPayments(row: Teacher) {
  return toTeacher(row, await paymentsForTeacher(row.id));
}

export default async (req: Request) => {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    if (req.method === "GET") {
      const [rows, payments] = await Promise.all([
        db.select().from(teachers).orderBy(teachers.name, teachers.id),
        listSalaryPayments(),
      ]);
      const grouped = new Map<number, typeof payments>();
      for (const payment of payments) {
        const list = grouped.get(payment.teacherId) ?? [];
        list.push(payment);
        grouped.set(payment.teacherId, list);
      }
      return json({
        teachers: rows.map((row) => toTeacher(row, grouped.get(row.id) ?? [])),
      });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const [created] = await db.insert(teachers).values(teacherFields(body)).returning();
      return json({ teacher: await withPayments(created) }, 201);
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/teachers",
  method: ["GET", "POST"],
};
