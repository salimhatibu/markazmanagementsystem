#!/usr/bin/env node
/**
 * One-time import helper: turns a Postgres dump (or JSON export) into D1 SQL.
 *
 * Usage:
 *   1. Export from Netlify Postgres into tmp/ (never commit dumps).
 *   2. Produce tmp/tables.json shaped as:
 *      { "students": [...], "fee_payments": [...], ... }
 *      using snake_case column names matching D1.
 *   3. node scripts/import-pg-to-d1.mjs > tmp/import.sql
 *   4. npx wrangler d1 execute markaz --remote --file=tmp/import.sql
 *
 * Money columns should already be decimal text (or numbers cast to text).
 * Booleans become 0/1. Timestamps become ISO strings.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), process.argv[2] || "tmp/tables.json");
const tables = JSON.parse(readFileSync(path, "utf8"));

const ORDER = [
  "settings",
  "students",
  "fee_payments",
  "teachers",
  "salary_payments",
  "expenses",
  "book_purchases",
  "feedback_tickets",
  "series",
  "posts",
  "reports",
  "notifications",
  "newsletter_subscribers",
  "blog_events",
  "blog_comments",
  "blog_likes",
  "blog_saves",
];

function sqlValue(value) {
  if (value == null) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
  const text = String(value).replace(/'/g, "''");
  return `'${text}'`;
}

console.log("PRAGMA foreign_keys = OFF;");
for (const table of ORDER) {
  const rows = tables[table];
  if (!Array.isArray(rows) || rows.length === 0) continue;
  for (const row of rows) {
    const cols = Object.keys(row);
    const values = cols.map((col) => sqlValue(row[col]));
    console.log(
      `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${values.join(", ")});`,
    );
  }
}
console.log("PRAGMA foreign_keys = ON;");
