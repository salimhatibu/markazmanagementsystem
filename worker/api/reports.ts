import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { reports } from "../../db/schema";
import { asIso } from "../../shared/format";
import type { ReceiptScope } from "../../shared/periods";
import { deleteReportPdf, feeReceiptPreview, generateOperationsReport } from "../_shared/generate-report";
import { requireAdmin } from "../_shared/auth";
import { fail, handleError, json, parseId, readBody } from "../_shared/http";

function asScope(value: unknown): ReceiptScope | null {
  if (value === "current" || value === "monthly" || value === "biweekly") return value;
  return null;
}

function asSection(value: unknown): "all" | "morning" | "evening" | null {
  if (value === undefined || value === "all") return "all";
  if (value === "morning" || value === "evening") return value;
  return null;
}

export default async (req: Request, context: Context) => {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    if (req.method === "DELETE") {
      const id = parseId(context.params.id);
      if (id == null) return fail("Report not found.", 404);
      const [row] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
      if (!row) return fail("Report not found.", 404);
      await deleteReportPdf(row.blobKey);
      await db.delete(reports).where(eq(reports.id, id));
      return json({ ok: true });
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const scope = asScope(url.searchParams.get("scope"));
      if (scope) {
        const section = asSection(url.searchParams.get("section") ?? "all");
        if (section == null) return fail("Section must be all, morning, or evening.", 400);
        return json(await feeReceiptPreview(scope, new Date(), section));
      }
      const rows = await db
        .select({
          id: reports.id,
          period: reports.period,
          section: reports.section,
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
          section: row.section,
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
      const section = asSection(body?.section);
      if (section == null) return fail("Section must be all, morning, or evening.", 400);
      const report = await generateOperationsReport(period, new Date(), scope, section);
      return json({ report }, report.created ? 201 : 200);
    }

    return fail("Method not allowed.", 405);
  } catch (error) {
    return handleError(error);
  }
};
