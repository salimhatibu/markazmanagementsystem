import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index";
import { schoolClasses, students, teachers } from "../../db/schema";
import { requireAdmin } from "../_shared/auth";
import { listFeePayments, toStudent } from "../_shared/data";
import { fail, handleError, json, parseId, readBody, ValidationError } from "../_shared/http";
import { requiredText } from "../_shared/validate";

function optionalTeacherId(value: unknown): number | null {
  if (value == null || value === "") return null;
  const id = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ValidationError("Choose a teacher.");
  return id;
}

async function teacherExists(id: number | null) {
  if (id == null) return true;
  const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.id, id)).limit(1);
  return Boolean(teacher);
}

export default async (req: Request, context: { params: Record<string, string> }) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const classId = context.params.id ? parseId(context.params.id) : null;
    const studentId = context.params.studentId ? parseId(context.params.studentId) : null;

    if (req.method === "GET" && !context.params.id) {
      const [rows, counts, teacherRows] = await Promise.all([
        db.select().from(schoolClasses).orderBy(asc(schoolClasses.name)),
        db
          .select({ classId: students.classId, total: sql<number>`count(*)` })
          .from(students)
          .groupBy(students.classId),
        db.select({ id: teachers.id, name: teachers.name }).from(teachers),
      ]);
      const byClass = new Map(counts.map((row) => [row.classId, Number(row.total)]));
      const teacherNames = new Map(teacherRows.map((row) => [row.id, row.name]));
      return json({
        classes: rows.map((row) => ({
          id: row.id,
          name: row.name,
          students: byClass.get(row.id) ?? 0,
          teacherId: row.teacherId,
          teacherName: row.teacherId == null ? null : teacherNames.get(row.teacherId) ?? null,
        })),
      });
    }

    if (req.method === "POST" && !context.params.id) {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const name = requiredText(body.name, "Class name", 80);
      const teacherId = optionalTeacherId(body.teacherId);
      if (!(await teacherExists(teacherId))) return fail("That teacher was not found.", 400);
      const [created] = await db
        .insert(schoolClasses)
        .values({ name, teacherId, updatedAt: new Date().toISOString() })
        .returning();
      const teacherRows = teacherId == null
        ? []
        : await db.select({ name: teachers.name }).from(teachers).where(eq(teachers.id, teacherId)).limit(1);
      const teacherName = teacherRows[0]?.name ?? null;
      return json({
        class: { id: created.id, name: created.name, students: 0, teacherId, teacherName },
      }, 201);
    }

    if (classId == null) return fail("Class not found.", 404);
    const [existing] = await db.select().from(schoolClasses).where(eq(schoolClasses.id, classId)).limit(1);
    if (!existing) return fail("Class not found.", 404);

    if (req.method === "GET") {
      const [rows, payments, teacherRows] = await Promise.all([
        db.select().from(students).where(eq(students.classId, classId)).orderBy(asc(students.name)),
        listFeePayments(),
        existing.teacherId == null
          ? Promise.resolve([])
          : db.select({ name: teachers.name }).from(teachers).where(eq(teachers.id, existing.teacherId)).limit(1),
      ]);
      const teacherName = teacherRows[0]?.name ?? null;
      const grouped = new Map<number, typeof payments>();
      for (const payment of payments) {
        if (!rows.some((row) => row.id === payment.studentId)) continue;
        const list = grouped.get(payment.studentId) ?? [];
        list.push(payment);
        grouped.set(payment.studentId, list);
      }
      return json({
        class: {
          id: existing.id,
          name: existing.name,
          students: rows.length,
          teacherId: existing.teacherId,
          teacherName,
        },
        students: rows.map((row) => toStudent(row, grouped.get(row.id) ?? [], existing.name)),
      });
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const name = requiredText(body.name, "Class name", 80);
      const teacherId = optionalTeacherId(body.teacherId);
      if (!(await teacherExists(teacherId))) return fail("That teacher was not found.", 400);
      const [updated] = await db
        .update(schoolClasses)
        .set({ name, teacherId, updatedAt: new Date().toISOString() })
        .where(eq(schoolClasses.id, classId))
        .returning();
      const teacherRows = teacherId == null
        ? []
        : await db.select({ name: teachers.name }).from(teachers).where(eq(teachers.id, teacherId)).limit(1);
      const teacherName = teacherRows[0]?.name ?? null;
      const [count] = await db
        .select({ total: sql<number>`count(*)` })
        .from(students)
        .where(eq(students.classId, classId));
      return json({
        class: {
          id: updated.id,
          name: updated.name,
          students: Number(count?.total ?? 0),
          teacherId: updated.teacherId,
          teacherName,
        },
      });
    }

    if (req.method === "DELETE" && studentId == null) {
      await db.delete(schoolClasses).where(eq(schoolClasses.id, classId));
      return json({ ok: true });
    }

    if (req.method === "POST" && context.params.studentId == null && req.url.includes("/students")) {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const id = parseId(String(body.studentId ?? ""));
      if (id == null) return fail("Choose a student.", 400);
      const [student] = await db.select().from(students).where(eq(students.id, id)).limit(1);
      if (!student) return fail("Student not found.", 404);
      if (student.classId === classId) return fail("This student is already in this class.", 400);
      await db.update(students).set({ classId, updatedAt: new Date().toISOString() }).where(eq(students.id, id));
      return json({ ok: true });
    }

    if (req.method === "DELETE" && studentId != null) {
      const [membership] = await db
        .select({ id: students.id })
        .from(students)
        .where(and(eq(students.id, studentId), eq(students.classId, classId)))
        .limit(1);
      if (!membership) return fail("Student is not in this class.", 404);
      await db
        .update(students)
        .set({ classId: null, updatedAt: new Date().toISOString() })
        .where(eq(students.id, studentId));
      return json({ ok: true });
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    if (error instanceof ValidationError) return handleError(error);
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("unique")) return fail("A class with that name already exists.", 400);
    return handleError(error);
  }
};
