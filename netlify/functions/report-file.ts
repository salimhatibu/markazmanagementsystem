import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { reports } from "../../db/schema";
import { readReportPdf } from "./_shared/generate-report";
import { fail, parseId, requireUser } from "./_shared/http";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") return fail("Method not allowed.", 405);
  const denied = await requireUser();
  if (denied) return denied;

  const id = parseId(context.params.id);
  if (id == null) return fail("Report not found.", 404);
  const [row] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  if (!row) return fail("Report not found.", 404);
  const bytes = await readReportPdf(row.pdf);
  if (!bytes) return fail("Report file not found.", 404);
  const filename = `markaz-${row.period}-${row.rangeStart}-to-${row.rangeEnd}.pdf`;
  return new Response(Uint8Array.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
};

export const config: Config = {
  path: "/api/reports/:id/file",
  method: "GET",
};
