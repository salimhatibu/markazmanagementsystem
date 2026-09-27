import type { Config } from "@netlify/functions";
import { students, type Student } from "../../db/schema";
import { db } from "../../db/index";
import { fail, handleError, json, readBody } from "./_shared/http";
import {
  listFeePayments,
  paymentsForStudent,
  toStudent,
} from "./_shared/data";
import { studentFields } from "./_shared/validate";

async function withPayments(row: Student) {
  const payments = await paymentsForStudent(row.id);
  return toStudent(row, payments);
}

export default async (req: Request) => {
  try {
    if (req.method === "GET") {
      const [rows, payments] = await Promise.all([
        db.select().from(students).orderBy(students.admissionNumber),
        listFeePayments(),
      ]);
      const grouped = new Map<number, typeof payments>();
      for (const payment of payments) {
        const list = grouped.get(payment.studentId) ?? [];
        list.push(payment);
        grouped.set(payment.studentId, list);
      }
      return json({
        students: rows.map((row) => toStudent(row, grouped.get(row.id) ?? [])),
      });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const input = studentFields(body);
      const [created] = await db.insert(students).values(input).returning();
      return json({ student: await withPayments(created) }, 201);
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/students",
  method: ["GET", "POST"],
};
