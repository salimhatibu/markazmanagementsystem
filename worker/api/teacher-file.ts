import { requireAdmin } from "../_shared/auth";
import { fail, handleError, parseId, SECURITY_HEADERS } from "../_shared/http";
import { teacherRecordPdf } from "../_shared/person-record";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") return fail("Method not allowed.", 405);
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = parseId(context.params.id);
  if (id == null) return fail("Teacher not found.", 404);
  try {
    const record = await teacherRecordPdf(id);
    if (!record) return fail("Teacher not found.", 404);
    return new Response(Uint8Array.from(record.bytes), {
      headers: {
        ...SECURITY_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${record.filename}"`,
      },
    });
  } catch (error) {
    return handleError(error);
  }
};
