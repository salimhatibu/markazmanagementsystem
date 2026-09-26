import type { Config } from "@netlify/functions";
import { desc } from "drizzle-orm";
import { db } from "../../db/index";
import { reports } from "../../db/schema";
import { generateOperationsReport } from "./_shared/generate-report";
import { fail, handleError, json, readBody, requireUser } from "./_shared/http";

export default async (req: Request) => {
  const denied = await requireUser();
  if (denied) return denied;

  try {
    if (req.method === "GET") {
      const rows = await db.select().from(reports).orderBy(desc(reports.createdAt));
      return json({
        reports: rows.map((row) => ({
          id: row.id,
          period: row.period,
          rangeStart: row.rangeStart,
          rangeEnd: row.rangeEnd,
          createdAt: row.createdAt.toISOString(),
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
