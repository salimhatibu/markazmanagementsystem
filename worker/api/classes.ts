import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index";
import { classTeachers, schoolClasses, students, teachers } from "../../db/schema";
import { requireAdmin } from "../_shared/auth";
import { listFeePayments, toStudent } from "../_shared/data";
import { fail, handleError, json, parseId, readBody, ValidationError } from "../_shared/http";
import { classSectionField, optionalTeacherIds, requiredText } from "../_shared/validate";

async function teachersExist(ids: number[]) {
  if (ids.length === 0) return true;
  const rows = await db.select({ id: teachers.id }).from(teachers).where(inArray(teachers.id, ids));
  return rows.length === ids.length;
}

async function setClassTeachers(classId: number, teacherIds: number[]) {
  await db.delete(classTeachers).where(eq(classTeachers.classId, classId));
  if (teacherIds.length === 0) return;
  await db.insert(classTeachers).values(teacherIds.map((teacherId) => ({ classId, teacherId })));
}

async function teacherMapFor(classIds: number[]) {
  if (classIds.length === 0) return new Map<number, { id: number; name: string }[]>();
  const rows = await db
    .select({ classId: classTeachers.classId, id: teachers.id, name: teachers.name })
    .from(classTeachers)
    .innerJoin(teachers, eq(classTeachers.teacherId, teachers.id))
    .where(inArray(classTeachers.classId, classIds))
    .orderBy(asc(teachers.name));
  const map = new Map<number, { id: number; name: string }[]>();
  for (const row of rows) {
    const list = map.get(row.classId) ?? [];
    list.push({ id: row.id, name: row.name });
    map.set(row.classId, list);
  }
  return map;
}

function presentClass(
  row: { id: number; name: string; section: "morning" | "evening" },
  studentCount: number,
  teacherList: { id: number; name: string }[],
) {
  return {
    id: row.id,
    name: row.name,
    section: row.section,
    students: studentCount,
    teacherIds: teacherList.map((teacher) => teacher.id),
    teacherNames: teacherList.map((teacher) => teacher.name),
  };
}

export default async (req: Request, context: { params: Record<string, string> }) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const classId = context.params.id ? parseId(context.params.id) : null;
    const studentId = context.params.studentId ? parseId(context.params.studentId) : null;

    if (req.method === "GET" && !context.params.id) {
      const [rows, counts] = await Promise.all([
        db.select().from(schoolClasses).orderBy(asc(schoolClasses.name)),
        db
          .select({ classId: students.classId, total: sql<number>`count(*)` })
          .from(students)
          .groupBy(students.classId),
      ]);
      const byClass = new Map(counts.map((row) => [row.classId, Number(row.total)]));
      const teacherMap = await teacherMapFor(rows.map((row) => row.id));
      return json({
        classes: rows.map((row) =>
          presentClass(row, byClass.get(row.id) ?? 0, teacherMap.get(row.id) ?? []),
        ),
      });
    }

    if (req.method === "POST" && !context.params.id) {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const name = requiredText(body.name, "Class name", 80);
      const section = classSectionField(body);
      const teacherIds = optionalTeacherIds(body.teacherIds);
      if (!(await teachersExist(teacherIds))) return fail("One of those teachers was not found.", 400);
      const [created] = await db
        .insert(schoolClasses)
        .values({ name, section, updatedAt: new Date().toISOString() })
        .returning();
      await setClassTeachers(created.id, teacherIds);
      const teacherList = teacherIds.length
        ? await db.select({ id: teachers.id, name: teachers.name }).from(teachers).where(inArray(teachers.id, teacherIds))
        : [];
      return json({ class: presentClass(created, 0, teacherList) }, 201);
    }

    if (classId == null) return fail("Class not found.", 404);
    const [existing] = await db.select().from(schoolClasses).where(eq(schoolClasses.id, classId)).limit(1);
    if (!existing) return fail("Class not found.", 404);

    if (req.method === "GET") {
      const [rows, payments, teacherList] = await Promise.all([
        db.select().from(students).where(eq(students.classId, classId)).orderBy(asc(students.name)),
        listFeePayments(),
        db
          .select({ id: teachers.id, name: teachers.name })
          .from(classTeachers)
          .innerJoin(teachers, eq(classTeachers.teacherId, teachers.id))
          .where(eq(classTeachers.classId, classId))
          .orderBy(asc(teachers.name)),
      ]);
      const grouped = new Map<number, typeof payments>();
      for (const payment of payments) {
        if (!rows.some((row) => row.id === payment.studentId)) continue;
        const list = grouped.get(payment.studentId) ?? [];
        list.push(payment);
        grouped.set(payment.studentId, list);
      }
      return json({
        class: presentClass(existing, rows.length, teacherList),
        students: rows.map((row) => toStudent(row, grouped.get(row.id) ?? [], existing.name)),
      });
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      if (!body) return fail("Request body must be an object.", 400);
      const name = requiredText(body.name, "Class name", 80);
      const section = classSectionField(body);
      const teacherIds = optionalTeacherIds(body.teacherIds);
      if (!(await teachersExist(teacherIds))) return fail("One of those teachers was not found.", 400);
      const [updated] = await db
        .update(schoolClasses)
        .set({ name, section, updatedAt: new Date().toISOString() })
        .where(eq(schoolClasses.id, classId))
        .returning();
      await setClassTeachers(classId, teacherIds);
      const [count, teacherList] = await Promise.all([
        db.select({ total: sql<number>`count(*)` }).from(students).where(eq(students.classId, classId)),
        teacherIds.length
          ? db.select({ id: teachers.id, name: teachers.name }).from(teachers).where(inArray(teachers.id, teacherIds))
          : Promise.resolve([]),
      ]);
      return json({ class: presentClass(updated, Number(count[0]?.total ?? 0), teacherList) });
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
