import {
  boolean,
  date,
  index,
  integer,
  uniqueIndex,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
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
  lastBalanceAlertAt: timestamp("last_balance_alert_at", { withTimezone: true }),
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
  phone: varchar({ length: 64 }),
  nationalId: varchar("national_id", { length: 64 }),
  mpesaName: varchar("mpesa_name", { length: 255 }),
  mpesaNumber: varchar("mpesa_number", { length: 64 }),
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

export const reports = pgTable(
  "reports",
  {
    id: serial().primaryKey(),
    period: reportPeriod().notNull(),
    rangeStart: date("range_start").notNull(),
    rangeEnd: date("range_end").notNull(),
    blobKey: varchar("blob_key", { length: 600 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [unique("reports_period_range_uid").on(table.period, table.rangeStart, table.rangeEnd)],
);

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
  address: varchar({ length: 255 }),
  accountName: varchar("account_name", { length: 255 }),
  bankName: varchar("bank_name", { length: 255 }),
  paybill: varchar({ length: 32 }),
  accountNumber: varchar("account_number", { length: 64 }),
});

export const expenses = pgTable(
  "expenses",
  {
    id: serial().primaryKey(),
    reason: varchar({ length: 255 }).notNull(),
    amount: money("amount").notNull(),
    details: text(),
    spentOn: date("spent_on").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("expenses_spent_on_idx").on(table.spentOn)],
);

export const series = pgTable("series", {
  id: serial().primaryKey(),
  slug: varchar({ length: 80 }).notNull().unique(),
  title: varchar({ length: 120 }).notNull(),
  blurb: varchar({ length: 400 }),
  createdAt: createdAt(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial().primaryKey(),
  email: varchar({ length: 255 }).notNull().unique(),
  token: varchar({ length: 64 }).notNull().unique(),
  createdAt: createdAt(),
});

export const posts = pgTable(
  "posts",
  {
    id: serial().primaryKey(),
    slug: varchar({ length: 180 }).notNull().unique(),
    title: varchar({ length: 255 }).notNull(),
    excerpt: varchar({ length: 500 }),
    coverKey: varchar("cover_key", { length: 400 }),
    bodyHtml: text("body_html").notNull(),
    seriesId: integer("series_id").references(() => series.id, { onDelete: "set null" }),
    published: boolean().notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("posts_published_idx").on(table.published, table.publishedAt),
    index("posts_series_idx").on(table.seriesId),
  ],
);

export const blogEvents = pgTable(
  "blog_events",
  {
    id: serial().primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    kind: varchar({ length: 16 }).notNull(),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    dwellMs: integer("dwell_ms"),
    createdAt: createdAt(),
  },
  (table) => [
    index("blog_events_post_kind_idx").on(table.postId, table.kind),
    index("blog_events_session_idx").on(table.sessionId, table.postId, table.kind),
    uniqueIndex("blog_events_device_kind_unique").on(table.postId, table.sessionId, table.kind),
  ],
);

export const blogComments = pgTable(
  "blog_comments",
  {
    id: serial().primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    body: text().notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("blog_comments_post_idx").on(table.postId)],
);

export const blogLikes = pgTable(
  "blog_likes",
  {
    id: serial().primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique("blog_likes_post_session_uid").on(table.postId, table.sessionId),
    index("blog_likes_post_idx").on(table.postId),
  ],
);

export const blogSaves = pgTable(
  "blog_saves",
  {
    id: serial().primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique("blog_saves_post_session_uid").on(table.postId, table.sessionId),
    index("blog_saves_post_idx").on(table.postId),
  ],
);

export type Student = typeof students.$inferSelect;
export type Teacher = typeof teachers.$inferSelect;
export type FeePayment = typeof feePayments.$inferSelect;
export type SalaryPayment = typeof salaryPayments.$inferSelect;
export type ReportRow = typeof reports.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Series = typeof series.$inferSelect;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type BlogEvent = typeof blogEvents.$inferSelect;
export type BlogComment = typeof blogComments.$inferSelect;
export type BlogLike = typeof blogLikes.$inferSelect;
export type BlogSave = typeof blogSaves.$inferSelect;
