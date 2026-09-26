import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamp = (name: string) =>
  text(name)
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);

export const users = sqliteTable("users", {
  id: integer().primaryKey({ autoIncrement: true }),
  email: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at"),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: text("expires_at").notNull(),
    createdAt: timestamp("created_at"),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const students = sqliteTable("students", {
  id: integer().primaryKey({ autoIncrement: true }),
  admissionNumber: text("admission_number").notNull().unique(),
  name: text().notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  gender: text().notNull(),
  section: text().notNull(),
  expectedFees: text("expected_fees").notNull(),
  guardianName: text("guardian_name").notNull(),
  guardianPhone: text("guardian_phone").notNull(),
  guardianEmail: text("guardian_email").notNull(),
  secondContactName: text("second_contact_name"),
  secondContactPhone: text("second_contact_phone"),
  secondContactEmail: text("second_contact_email"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const feePayments = sqliteTable(
  "fee_payments",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    amount: text().notNull(),
    paidOn: text("paid_on").notNull(),
    note: text(),
    createdAt: timestamp("created_at"),
  },
  (table) => [index("fee_payments_student_id_idx").on(table.studentId)],
);

export const teachers = sqliteTable("teachers", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  gender: text().notNull(),
  expectedSalary: text("expected_salary").notNull(),
  expectedReleaseDate: text("expected_release_date").notNull(),
  paidInAdvance: integer("paid_in_advance", { mode: "boolean" }).notNull().default(false),
  section: text().notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const salaryPayments = sqliteTable(
  "salary_payments",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    teacherId: integer("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    amount: text().notNull(),
    paidOn: text("paid_on").notNull(),
    note: text(),
    createdAt: timestamp("created_at"),
  },
  (table) => [index("salary_payments_teacher_id_idx").on(table.teacherId)],
);

export const reports = sqliteTable("reports", {
  id: integer().primaryKey({ autoIncrement: true }),
  period: text().notNull(),
  rangeStart: text("range_start").notNull(),
  rangeEnd: text("range_end").notNull(),
  blobKey: text("blob_key").notNull(),
  pdf: text().notNull(),
  createdAt: timestamp("created_at"),
});

export const notifications = sqliteTable("notifications", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  reportId: integer("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  readAt: text("read_at"),
  createdAt: timestamp("created_at"),
});

export const settings = sqliteTable("settings", {
  id: integer().primaryKey({ autoIncrement: true }),
  markazName: text("markaz_name"),
  currencySymbol: text("currency_symbol"),
});

export type Student = typeof students.$inferSelect;
export type Teacher = typeof teachers.$inferSelect;
export type FeePayment = typeof feePayments.$inferSelect;
export type SalaryPayment = typeof salaryPayments.$inferSelect;
export type ReportRow = typeof reports.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
export type UserRow = typeof users.$inferSelect;
