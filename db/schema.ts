import {
  index,
  integer,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const money = (name: string) => text(name).notNull();
const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`);
const updatedAt = () =>
  text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`);

/** Teaching groups, separate from the morning/evening sitting. */
export const schoolClasses = sqliteTable("school_classes", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  teacherId: integer("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const students = sqliteTable("students", {
  id: integer().primaryKey({ autoIncrement: true }),
  admissionNumber: text("admission_number").notNull().unique(),
  name: text().notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  gender: text({ enum: ["male", "female"] }).notNull(),
  section: text({ enum: ["morning", "evening"] }).notNull(),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "set null" }),
  expectedFees: money("expected_fees"),
  admittedOn: text("admitted_on").notNull().default(""),
  admissionFeeCollected: integer("admission_fee_collected", { mode: "boolean" }).notNull().default(false),
  admissionFeeAmount: money("admission_fee_amount").default("0.00").notNull(),
  guardianName: text("guardian_name").notNull(),
  guardianPhone: text("guardian_phone").notNull(),
  guardianEmail: text("guardian_email").notNull(),
  secondContactName: text("second_contact_name"),
  secondContactPhone: text("second_contact_phone"),
  secondContactEmail: text("second_contact_email"),
  lastBalanceAlertAt: text("last_balance_alert_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const feePayments = sqliteTable(
  "fee_payments",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    amount: money("amount"),
    paidOn: text("paid_on").notNull(),
    note: text(),
    createdAt: createdAt(),
  },
  (table) => [index("fee_payments_student_id_idx").on(table.studentId)],
);

/** Students who have left the markaz — snapshot kept after removal from active students. */
export const kharajah = sqliteTable(
  "kharajah",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    admissionNumber: text("admission_number").notNull(),
    name: text().notNull(),
    dateOfBirth: text("date_of_birth").notNull(),
    gender: text({ enum: ["male", "female"] }).notNull(),
    section: text({ enum: ["morning", "evening"] }).notNull(),
    expectedFees: money("expected_fees"),
    admittedOn: text("admitted_on").notNull().default(""),
    admissionFeeCollected: integer("admission_fee_collected", { mode: "boolean" }).notNull().default(false),
    admissionFeeAmount: money("admission_fee_amount").default("0.00").notNull(),
    feesPaid: money("fees_paid").default("0.00").notNull(),
    guardianName: text("guardian_name").notNull(),
    guardianPhone: text("guardian_phone").notNull(),
    guardianEmail: text("guardian_email").notNull(),
    secondContactName: text("second_contact_name"),
    secondContactPhone: text("second_contact_phone"),
    secondContactEmail: text("second_contact_email"),
    leftOn: text("left_on").notNull(),
    leaveReason: text("leave_reason").notNull(),
    notes: text(),
    createdAt: createdAt(),
  },
  (table) => [index("kharajah_left_on_idx").on(table.leftOn)],
);

export const teachers = sqliteTable("teachers", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  gender: text({ enum: ["male", "female"] }).notNull(),
  phone: text(),
  nationalId: text("national_id"),
  mpesaName: text("mpesa_name"),
  mpesaNumber: text("mpesa_number"),
  expectedSalary: money("expected_salary"),
  expectedReleaseDate: text("expected_release_date").notNull(),
  paidInAdvance: integer("paid_in_advance", { mode: "boolean" }).notNull().default(false),
  section: text({ enum: ["morning", "evening", "both"] }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const salaryPayments = sqliteTable(
  "salary_payments",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    teacherId: integer("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    amount: money("amount"),
    paidOn: text("paid_on").notNull(),
    note: text(),
    createdAt: createdAt(),
  },
  (table) => [index("salary_payments_teacher_id_idx").on(table.teacherId)],
);

export const reports = sqliteTable(
  "reports",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    period: text({ enum: ["biweekly", "monthly"] }).notNull(),
    rangeStart: text("range_start").notNull(),
    rangeEnd: text("range_end").notNull(),
    blobKey: text("blob_key").notNull(),
    createdAt: createdAt(),
  },
  (table) => [unique("reports_period_range_uid").on(table.period, table.rangeStart, table.rangeEnd)],
);

export const notifications = sqliteTable("notifications", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  reportId: integer("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  readAt: text("read_at"),
  createdAt: createdAt(),
});

export const settings = sqliteTable("settings", {
  id: integer().primaryKey({ autoIncrement: true }),
  markazName: text("markaz_name"),
  currencySymbol: text("currency_symbol"),
  address: text(),
  accountName: text("account_name"),
  bankName: text("bank_name"),
  paybill: text(),
  accountNumber: text("account_number"),
});

export const expenses = sqliteTable(
  "expenses",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    reason: text().notNull(),
    amount: money("amount"),
    details: text(),
    spentOn: text("spent_on").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("expenses_spent_on_idx").on(table.spentOn)],
);

/** Named trip / transport ledger (e.g. Trip 2024, Transport Money). */
export const trips = sqliteTable("trips", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  notes: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Income or spend lines under a trip ledger. */
export const tripEntries = sqliteTable(
  "trip_entries",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    tripId: integer("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    description: text().notNull(),
    /** Optional quantity / unit note, e.g. "4", "1/2 kg", "20 litres". */
    quantity: text(),
    amount: money("amount"),
    /** in = money received; out = money spent on the trip. */
    kind: text({ enum: ["in", "out"] }).notNull().default("in"),
    entryOn: text("entry_on").notNull(),
    notes: text(),
    createdAt: createdAt(),
  },
  (table) => [
    index("trip_entries_trip_id_idx").on(table.tripId),
    index("trip_entries_entry_on_idx").on(table.entryOn),
  ],
);

export const bookPurchases = sqliteTable(
  "book_purchases",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    unitCost: money("unit_cost"),
    quantity: integer().notNull(),
    purchasedOn: text("purchased_on").notNull(),
    expenseId: integer("expense_id").references(() => expenses.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (table) => [index("book_purchases_purchased_on_idx").on(table.purchasedOn)],
);

/** A titled batch of books bought together (class list / price list). */
export const bookInventories = sqliteTable(
  "book_inventories",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    purchasedOn: text("purchased_on").notNull(),
    stationeriesNote: text("stationeries_note"),
    stationeriesCost: text("stationeries_cost"),
    expenseId: integer("expense_id").references(() => expenses.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (table) => [index("book_inventories_purchased_on_idx").on(table.purchasedOn)],
);

export const bookInventoryItems = sqliteTable(
  "book_inventory_items",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    inventoryId: integer("inventory_id")
      .notNull()
      .references(() => bookInventories.id, { onDelete: "cascade" }),
    name: text().notNull(),
    price: money("price"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("book_inventory_items_inventory_id_idx").on(table.inventoryId)],
);

export const feedbackTickets = sqliteTable(
  "feedback_tickets",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    kind: text({ enum: ["query", "suggestion"] }).notNull().default("query"),
    body: text().notNull(),
    done: integer({ mode: "boolean" }).notNull().default(false),
    doneAt: text("done_at"),
    cancelled: integer({ mode: "boolean" }).notNull().default(false),
    cancelledAt: text("cancelled_at"),
    createdAt: createdAt(),
  },
  (table) => [index("feedback_tickets_done_idx").on(table.done, table.cancelled, table.createdAt)],
);

export const series = sqliteTable("series", {
  id: integer().primaryKey({ autoIncrement: true }),
  slug: text().notNull().unique(),
  title: text().notNull(),
  blurb: text(),
  createdAt: createdAt(),
});

export const newsletterSubscribers = sqliteTable("newsletter_subscribers", {
  id: integer().primaryKey({ autoIncrement: true }),
  email: text().notNull().unique(),
  token: text().notNull().unique(),
  createdAt: createdAt(),
});

export const posts = sqliteTable(
  "posts",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    slug: text().notNull().unique(),
    title: text().notNull(),
    excerpt: text(),
    coverKey: text("cover_key"),
    bodyHtml: text("body_html").notNull(),
    seriesId: integer("series_id").references(() => series.id, { onDelete: "set null" }),
    published: integer({ mode: "boolean" }).notNull().default(false),
    publishedAt: text("published_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("posts_published_idx").on(table.published, table.publishedAt),
    index("posts_series_idx").on(table.seriesId),
  ],
);

export const blogEvents = sqliteTable(
  "blog_events",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    kind: text().notNull(),
    sessionId: text("session_id").notNull(),
    dwellMs: integer("dwell_ms"),
    createdAt: createdAt(),
  },
  (table) => [
    index("blog_events_post_kind_idx").on(table.postId, table.kind),
    index("blog_events_session_idx").on(table.sessionId, table.postId, table.kind),
    uniqueIndex("blog_events_device_kind_unique").on(table.postId, table.sessionId, table.kind),
  ],
);

export const blogComments = sqliteTable(
  "blog_comments",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    body: text().notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("blog_comments_post_idx").on(table.postId)],
);

export const blogLikes = sqliteTable(
  "blog_likes",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique("blog_likes_post_session_uid").on(table.postId, table.sessionId),
    index("blog_likes_post_idx").on(table.postId),
  ],
);

export const blogSaves = sqliteTable(
  "blog_saves",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique("blog_saves_post_session_uid").on(table.postId, table.sessionId),
    index("blog_saves_post_idx").on(table.postId),
  ],
);

/** Keepers currently or recently on the desk — keyed by Access email. */
export const adminPresence = sqliteTable(
  "admin_presence",
  {
    email: text().primaryKey(),
    name: text(),
    lastSeenAt: text("last_seen_at").notNull(),
  },
  (table) => [index("admin_presence_last_seen_idx").on(table.lastSeenAt)],
);

export type Student = typeof students.$inferSelect;
export type SchoolClass = typeof schoolClasses.$inferSelect;
export type AdminPresence = typeof adminPresence.$inferSelect;
export type KharajahRow = typeof kharajah.$inferSelect;
export type Teacher = typeof teachers.$inferSelect;
export type FeePayment = typeof feePayments.$inferSelect;
export type SalaryPayment = typeof salaryPayments.$inferSelect;
export type ReportRow = typeof reports.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type TripEntry = typeof tripEntries.$inferSelect;
export type BookPurchase = typeof bookPurchases.$inferSelect;
export type BookInventory = typeof bookInventories.$inferSelect;
export type BookInventoryItem = typeof bookInventoryItems.$inferSelect;
export type FeedbackTicket = typeof feedbackTickets.$inferSelect;
export type Series = typeof series.$inferSelect;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type BlogEvent = typeof blogEvents.$inferSelect;
export type BlogComment = typeof blogComments.$inferSelect;
export type BlogLike = typeof blogLikes.$inferSelect;
export type BlogSave = typeof blogSaves.$inferSelect;
