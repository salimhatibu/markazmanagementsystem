import type { Config } from "@netlify/functions";
import { students, type Student } from "../../db/schema";
import { db } from "../../db/index";
import { fail, handleError, json, readBody, requireUser } from "./_shared/http";
import {
  listFeePayments,
  paymentsForStudent,
  toStudent,
} from "./_shared/data";
import {
  oneOf,
  optionalEmail,
  optionalText,
  parseBirthDate,
  parseMoney,
  requiredEmail,
  requiredText,
} from "./_shared/validate";

function studentInput(body: Record<string, unknown>) {
  return {
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
  };
}

async function withPayments(row: Student) {
  const payments = await paymentsForStudent(row.id);
  return toStudent(row, payments);
}

export default async (req: Request) => {
  const denied = await requireUser();
  if (denied) return denied;

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
      const input = studentInput(body);
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
