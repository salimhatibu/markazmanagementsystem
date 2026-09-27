import type { Config } from "@netlify/functions";
import { desc } from "drizzle-orm";
import { db } from "../../db/index";
import { reports } from "../../db/schema";
import { feeReceiptPreview, generateOperationsReport } from "./_shared/generate-report";
import { asIso } from "../../shared/format";
import { fail, handleError, json, readBody } from "./_shared/http";
import type { ReceiptScope } from "../../shared/periods";

function asScope(value: unknown): ReceiptScope | null {
  if (value === "current" || value === "monthly" || value === "biweekly") return value;
  return null;
}

export default async (req: Request) => {
  try {
    if (req.method === "GET") {
      const scope = asScope(new URL(req.url).searchParams.get("scope"));
      if (scope) return json(await feeReceiptPreview(scope));
      const rows = await db
        .select({
          id: reports.id,
          period: reports.period,
          rangeStart: reports.rangeStart,
          rangeEnd: reports.rangeEnd,
          createdAt: reports.createdAt,
        })
        .from(reports)
        .orderBy(desc(reports.createdAt));
      return json({
        reports: rows.map((row) => ({
          id: row.id,
          period: row.period,
          rangeStart: row.rangeStart,
          rangeEnd: row.rangeEnd,
          createdAt: asIso(row.createdAt),
        })),
      });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const period = body?.period;
      if (period !== "biweekly" && period !== "monthly") {
        return fail("Period must be biweekly or monthly.", 400);
      }
      const scope = asScope(body?.scope) ?? (period === "biweekly" ? "biweekly" : "monthly");
      const report = await generateOperationsReport(period, new Date(), scope);
      return json({ report }, report.created ? 201 : 200);
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/reports",
  method: ["GET", "POST"],
};
