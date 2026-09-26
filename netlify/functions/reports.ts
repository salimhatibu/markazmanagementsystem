import type { Config } from "@netlify/functions";
import { desc } from "drizzle-orm";
import { db } from "../../db/index";
import { reports } from "../../db/schema";
import { generateOperationsReport } from "./_shared/generate-report";
import { asIso } from "../../shared/format";
import { fail, handleError, json, readBody } from "./_shared/http";

export default async (req: Request) => {
  try {
    if (req.method === "GET") {
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
      const report = await generateOperationsReport(period);
      return json({ report }, 201);
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
