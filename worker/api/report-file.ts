import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { reports } from "../../db/schema";
import { readReportPdf } from "../_shared/generate-report";
import { requireAdmin } from "../_shared/auth";
import { fail, parseId, SECURITY_HEADERS } from "../_shared/http";
import { isReportBlobKey } from "../_shared/validate";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") return fail("Method not allowed.", 405);
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = parseId(context.params.id);
  if (id == null) return fail("Report not found.", 404);
  const [row] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  if (!row) return fail("Report not found.", 404);
  if (!isReportBlobKey(row.blobKey)) return fail("Report file not found.", 404);
  const bytes = await readReportPdf(row.blobKey);
  if (!bytes) return fail("Report file not found.", 404);
  const filename = `markaz-${row.period}-${row.rangeStart}-to-${row.rangeEnd}.pdf`.replace(
    /[^A-Za-z0-9._-]/g,
    "-",
  );
  return new Response(Uint8Array.from(bytes), {
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
};

