import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const gender = pgEnum("gender", ["male", "female"]);
export const studentSection = pgEnum("student_section", ["morning", "evening"]);
export const teacherSection = pgEnum("teacher_section", ["morning", "evening", "both"]);
export const reportPeriod = pgEnum("report_period", ["biweekly", "monthly"]);

const money = (name: string) => numeric(name, { precision: 12, scale: 2 });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const students = pgTable("students", {
  id: serial().primaryKey(),
  admissionNumber: varchar("admission_number", { length: 64 }).notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: gender().notNull(),
  section: studentSection().notNull(),
  expectedFees: money("expected_fees").notNull(),
  guardianName: varchar("guardian_name", { length: 255 }).notNull(),
  guardianPhone: varchar("guardian_phone", { length: 64 }).notNull(),
  guardianEmail: varchar("guardian_email", { length: 255 }).notNull(),
  secondContactName: varchar("second_contact_name", { length: 255 }),
  secondContactPhone: varchar("second_contact_phone", { length: 64 }),
  secondContactEmail: varchar("second_contact_email", { length: 255 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const feePayments = pgTable(
  "fee_payments",
  {
    id: serial().primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    amount: money("amount").notNull(),
    paidOn: date("paid_on").notNull(),
    note: text(),
    createdAt: createdAt(),
  },
  (table) => [index("fee_payments_student_id_idx").on(table.studentId)],
);

export const teachers = pgTable("teachers", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: gender().notNull(),
  expectedSalary: money("expected_salary").notNull(),
  expectedReleaseDate: date("expected_release_date").notNull(),
  paidInAdvance: boolean("paid_in_advance").notNull().default(false),
  section: teacherSection().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const salaryPayments = pgTable(
  "salary_payments",
  {
    id: serial().primaryKey(),
    teacherId: integer("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    amount: money("amount").notNull(),
    paidOn: date("paid_on").notNull(),
    note: text(),
    createdAt: createdAt(),
  },
  (table) => [index("salary_payments_teacher_id_idx").on(table.teacherId)],
);

export const reports = pgTable("reports", {
  id: serial().primaryKey(),
  period: reportPeriod().notNull(),
  rangeStart: date("range_start").notNull(),
  rangeEnd: date("range_end").notNull(),
  blobKey: varchar("blob_key", { length: 600 }).notNull(),
  createdAt: createdAt(),
});

export const notifications = pgTable("notifications", {
  id: serial().primaryKey(),
  title: varchar({ length: 255 }).notNull(),
  reportId: integer("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const settings = pgTable("settings", {
  id: serial().primaryKey(),
  markazName: varchar("markaz_name", { length: 255 }),
  currencySymbol: varchar("currency_symbol", { length: 16 }),
});

export type Student = typeof students.$inferSelect;
export type Teacher = typeof teachers.$inferSelect;
export type FeePayment = typeof feePayments.$inferSelect;
export type SalaryPayment = typeof salaryPayments.$inferSelect;
export type ReportRow = typeof reports.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
